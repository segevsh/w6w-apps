import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

test("mapComponentStatus: maps the Statuspage component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

test("mapIndicator: maps the page-level indicator", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
});

test("componentKey: prefers the vendor id over a name slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "External API v1" }, 0), "abc123");
  assertEquals(componentKey({ name: "External API v1" }, 2), "external-api-v1-2");
});

test("check: ok with all-operational components", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "Affinity", url: "https://status.affinity.co" },
        components: [
          { id: "a", name: "CRM", status: "operational", group: false },
          { id: "b", name: "External API v1", status: "operational", group: false },
        ],
        incidents: [],
        scheduled_maintenances: [],
        status: { indicator: "none", description: "All Systems Operational" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

test("check: down when the page indicator is critical", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "Affinity", url: "https://status.affinity.co" },
        components: [{ id: "b", name: "External API v1", status: "major_outage", group: false }],
        status: { indicator: "critical" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

test("check: unknown (never down) when the status page itself errors", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("check: unknown when the page no longer self-identifies as Affinity's", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "Someone Else", url: "https://status.example.com" },
        components: [{ id: "a", name: "Whatever", status: "operational" }],
        status: { indicator: "none" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("check: group components are excluded from the component map", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "Affinity", url: "https://status.affinity.co" },
        components: [
          { id: "grp", name: "Affinity API", status: "operational", group: true },
          { id: "leaf", name: "External API v1", status: "operational", group: false },
        ],
        status: { indicator: "none" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["leaf"]);
});
