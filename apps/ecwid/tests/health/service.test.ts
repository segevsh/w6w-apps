import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_ID,
  API_COMPONENT_NAME,
  findApiComponent,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** A trimmed copy of the real 2026-09-22 body, keeping the six live components. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "nb703gphjy4r", name: "Ecwid", url: "https://status.ecwid.com" },
    components: [
      { id: "vlmnd9g3kgsg", name: "Storefront", status: "operational", group: false },
      { id: "rhn2nc83lt9g", name: "Checkout", status: "operational", group: false },
      { id: "cd53htlvdy4g", name: "Admin", status: "operational", group: false },
      { id: "7qn5f4cpf4g8", name: "API", status: "operational", group: false },
      { id: "g8f9ympwjk8h", name: "Third-party services", status: "operational", group: false },
      { id: "kchgpcpknmgn", name: "Billing", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("service: the status URL is Ecwid's own Statuspage", () => {
  assertEquals(STATUS_URL, "https://status.ecwid.com/api/v2/summary.json");
  assertEquals(API_COMPONENT_ID, "7qn5f4cpf4g8");
  assertEquals(API_COMPONENT_NAME, "API");
});

Deno.test("service: component statuses map to the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: the page indicator maps separately from a component's status", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: the API component is found by id, then by exact name", () => {
  const byId = findApiComponent([
    { id: "other", name: "Renamed", status: "major_outage" },
    { id: API_COMPONENT_ID, name: "API v2", status: "operational" },
  ]);
  assertEquals(byId?.id, API_COMPONENT_ID);

  const byName = findApiComponent([{ id: "new-id", name: "api", status: "operational" }]);
  assertEquals(byName?.name, "api");

  // `Third-party services` must never be mistaken for the API component.
  assertEquals(findApiComponent([{ id: "x", name: "Third-party services" }]), undefined);
});

Deno.test("service: a healthy API reads ok even when another component is down", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "vlmnd9g3kgsg", name: "Storefront", status: "major_outage", group: false },
          { id: API_COMPONENT_ID, name: "API", status: "operational", group: false },
        ],
        status: { indicator: "critical", description: "Partial System Outage" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  // The verdict follows the API component: a storefront incident is not
  // evidence that app.ecwid.com is failing.
  assertEquals(report.state, "ok");
  assert(report.message?.includes("Storefront (major_outage)"), report.message);
  assert(report.message?.includes("page-level indicator"), report.message);
  assertEquals(Object.keys(report.components ?? {}).length, 2);
  assertEquals(report.ttlSeconds, 60);
});

Deno.test("service: an API outage is the verdict", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: API_COMPONENT_ID, name: "API", status: "major_outage", group: false },
          { id: "vlmnd9g3kgsg", name: "Storefront", status: "operational", group: false },
        ],
        status: { indicator: "critical", description: "Partial System Outage" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.[API_COMPONENT_ID].state, "down");
  assertEquals(report.components?.[API_COMPONENT_ID].message, "API: major_outage");
});

Deno.test("service: a degraded API reads degraded", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [{ id: API_COMPONENT_ID, name: "API", status: "degraded_performance" }],
        incidents: [{ name: "Elevated API latency", status: "investigating" }],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("1 open incident(s)"), report.message);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const failing = mockCtx([{ status: 503, body: undefined }]);
  assertEquals((await service.check!({}, failing.ctx)).state, "unknown");

  const unreadable = mockCtx([{ body: "<html>" }]);
  assertEquals((await service.check!({}, unreadable.ctx)).state, "unknown");
});

Deno.test("service: a status page that is no longer Ecwid's is unknown", async () => {
  const { ctx } = mockCtx([
    { body: summary({ page: { name: "Other", url: "https://status.example.com" } }) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no longer self-identifies"), report.message);
});

Deno.test("service: a page without an API component is unknown, not ok", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [{ id: "vlmnd9g3kgsg", name: "Storefront", status: "operational" }],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("API` component"), report.message);
});

Deno.test("service: the probe is unsigned and only reaches the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.ecwid.com"]);
});
