import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const REAL_SUMMARY = {
  page: { id: "cf8c8l00p2r5", name: "Float", url: "https://status.float.com" },
  components: [
    { id: "t0cs5hs9sz62", name: "Float App", status: "operational" },
    { id: "rflwrc6jxg1r", name: "API - public", status: "operational" },
    { id: "xnfw253hzxv6", name: "www.float.com", status: "operational" },
    { id: "f4wbnpq57lhw", name: "Float Payments & Subscriptions", status: "operational" },
  ],
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
};

Deno.test("mapComponentStatus - maps the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator - maps the page-level roll-up", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator("bogus"), "unknown");
});

Deno.test("componentKey - prefers the vendor id, falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "API" }, 0), "abc123");
  assertEquals(componentKey({ name: "API - public" }, 2), "api-public-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("check - all-operational summary reports ok with all four real components", async () => {
  const { ctx } = mockCtx([{ status: 200, body: REAL_SUMMARY }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 4);
  assertEquals(report.components?.["rflwrc6jxg1r"].state, "ok");
});

Deno.test("check - a degraded API - public component surfaces in the message", async () => {
  const degraded = {
    ...REAL_SUMMARY,
    components: REAL_SUMMARY.components.map((c) =>
      c.id === "rflwrc6jxg1r" ? { ...c, status: "partial_outage" } : c
    ),
    status: { indicator: "minor", description: "Partial API outage" },
  };
  const { ctx } = mockCtx([{ status: 200, body: degraded }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("API - public"), true);
});

Deno.test("check - a non-200 status page response is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check - a page that no longer self-identifies as Float's is unknown", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { ...REAL_SUMMARY, page: { ...REAL_SUMMARY.page, url: "https://status.example.com" } },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
