import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { API_COMPONENT_ID, mapComponentStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

test("service: maps every documented Statuspage component status", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

test("service: ok when the Donorbox API component is operational", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { url: "https://status.donorbox.org" },
      components: [{ id: API_COMPONENT_ID, name: "Donorbox API", status: "operational" }],
      incidents: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("service: degraded when the Donorbox API component reports partial_outage", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { url: "https://status.donorbox.org" },
      components: [{ id: API_COMPONENT_ID, name: "Donorbox API", status: "partial_outage" }],
      incidents: [{ name: "API slowness" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.[API_COMPONENT_ID].state, "degraded");
});

test("service: unknown when the status page itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: unknown when the Donorbox API component disappears from the page", async () => {
  const { ctx } = mockCtx([{ body: { components: [{ id: "other", status: "operational" }] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: is app-scoped, unsigned, and allows only the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.donorbox.org"]);
});
