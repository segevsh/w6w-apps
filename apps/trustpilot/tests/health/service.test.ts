import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

test("service: mapComponentStatus covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

test("service: mapIndicator covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

test("service: componentKey prefers the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc123" }, 0), "abc123");
  assertEquals(componentKey({ name: "APIs" }, 2), "apis-2");
  assertEquals(componentKey({}, 5), "component-5");
});

test("service: an all-operational page reports ok", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: { url: "https://status.trustpilot.com" },
        components: [{ id: "c1", name: "APIs", status: "operational", group: false }],
        status: { indicator: "none", description: "All Systems Operational" },
        incidents: [],
        scheduled_maintenances: [],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.c1.state, "ok");
});

test("service: a major outage on one component reports down at the page level", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: { url: "https://status.trustpilot.com" },
        components: [{ id: "c1", name: "APIs", status: "major_outage", group: false }],
        status: { indicator: "critical", description: "Major outage" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("Major outage"), true);
});

test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: a page that no longer self-identifies as Trustpilot's is unknown", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { page: { url: "https://status.someoneelse.com" }, components: [{ name: "X" }] },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: group container rows are excluded from the component map", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: { url: "https://status.trustpilot.com" },
        components: [
          { id: "grp", name: "General Availability", status: "operational", group: true },
          { id: "c1", name: "APIs", status: "operational", group: false },
        ],
        status: { indicator: "none" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.grp, undefined);
  assertEquals(report.components?.c1.state, "ok");
});

test("service: is unsigned and app-scoped, and only widens egress to its own status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.trustpilot.com"]);
});
