import { assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Shaped like the live response measured 2026-09-29 (flat components, no groups). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "pg_1", name: "beehiiv", url: "https://www.beehiivstatus.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "c1", name: "Publication websites", status: "operational" },
      { id: "c2", name: "Public API", status: "operational" },
      { id: "c3", name: "Sending emails", status: "operational" },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://www.beehiivstatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["www.beehiivstatus.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
});

Deno.test("service: components are keyed by the vendor's stable id", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["c2"]?.message, "Public API");
});

Deno.test("service: a Public API outage is named explicitly in the message", async () => {
  const body = summary({ status: { indicator: "major", description: "Partial System Outage" } });
  (body.components[1] as { status: string }).status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("Public API (major_outage)"), true);
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "gateway error" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a redirect to an unclaimed page is unknown, not trusted", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { url: "https://example.com/" } }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: no readable body is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "not json" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: no components in the response is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: covers Statuspage's page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug, then an index", () => {
  assertEquals(componentKey({ id: "c1", name: "Public API" }, 0), "c1");
  assertEquals(componentKey({ name: "Public API" }, 0), "public-api-0");
  assertEquals(componentKey({}, 3), "component-3");
});
