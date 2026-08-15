import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "w1vms1jfy8ry", name: "Thinkific", url: "https://status.thinkific.com" },
    components: [
      { id: "app", name: "Thinkific Application", status: "operational", group: false },
      { id: "site", name: "Thinkific.com", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("mapComponentStatus: covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc123" }, 0), "abc123");
  assertEquals(componentKey({ name: "Thinkific Application" }, 0), "thinkific-application-0");
  assertEquals(componentKey({}, 3), "component-3");
});

Deno.test("check: all-operational reports ok with every component", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 2);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("check: a degraded primary component worsens the verdict even if the indicator lags", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: summary({
        components: [
          { id: "app", name: "Thinkific Application", status: "partial_outage", group: false },
        ],
        status: { indicator: "none" }, // page-level indicator has not caught up yet
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("check: a non-2xx status page response is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: group rows are excluded so they never double-count", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: summary({
        components: [
          { id: "grp", name: "External services", status: "operational", group: true },
          { id: "app", name: "Thinkific Application", status: "operational", group: false },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}).length, 1);
});

Deno.test("check: a page that no longer self-identifies as Thinkific's is unknown", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: summary({ page: { id: "x", name: "Someone Else", url: "https://status.example.com" } }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service check declares its own status-host allowlist and is unsigned", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.thinkific.com"]);
  assertEquals(service.scope, "app");
});

Deno.test("check: never reads the app's own network.allow host", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../../package.json", import.meta.url)));
  assert(!pkg.w6w.network.allow.includes("status.thinkific.com"));
});
