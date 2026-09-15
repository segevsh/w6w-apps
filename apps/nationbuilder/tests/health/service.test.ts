import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";

Deno.test("mapComponentStatus: maps Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: maps the page-level roll-up", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor's id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc123" }, 0), "abc123");
  assertEquals(componentKey({ name: "API" }, 2), "api-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: all-operational reports ok and names the API component", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      page: { name: "NationBuilder", url: "https://status.nationbuilder.com" },
      components: [{ id: "c1", name: "API", status: "operational" }],
      status: { indicator: "none", description: "All Systems Operational" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.c1, { state: "ok", message: "API" });
  assertEquals(calls[0].url, "https://status.nationbuilder.com/api/v2/summary.json");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("service: a degraded API component is surfaced by name", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "NationBuilder", url: "https://status.nationbuilder.com" },
      components: [{ id: "c1", name: "API", status: "partial_outage" }],
      status: { indicator: "minor" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.c1.state, "degraded");
});

Deno.test("service: group rows are skipped so they never double-count", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "NationBuilder" },
      components: [
        { id: "g1", name: "Group", status: "operational", group: true },
        { id: "c1", name: "API", status: "operational" },
      ],
      status: { indicator: "none" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["c1"]);
});

Deno.test("service: an unreadable body is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as NationBuilder's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Someone Else", url: "https://status.example.com" },
      components: [
        { id: "c1", name: "API", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is scoped app-wide, unsigned, and only reaches the status host", () => {
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.nationbuilder.com"]);
});
