import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Partial<{
  indicator: string;
  components: Array<{ id: string; name: string; status: string; group?: boolean }>;
  pageUrl: string;
}> = {}) {
  return {
    page: {
      id: "p1",
      name: "Sharetribe",
      url: overrides.pageUrl ?? "https://status.sharetribe.com",
    },
    status: { indicator: overrides.indicator ?? "none", description: "All Systems Operational" },
    components: overrides.components ?? [
      { id: "c1", name: "Marketplace API", status: "operational" },
      { id: "c2", name: "Integration API", status: "operational" },
      { id: "c3", name: "Authentication API", status: "operational" },
      { id: "c4", name: "Asset Delivery API", status: "operational" },
      { id: "grp", name: "3rd Party Services", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
  };
}

Deno.test("mapComponentStatus / mapIndicator: Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "Integration API" }, 2), "integration-api-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service.check: all-operational page -> ok, names every covered component", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary() }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.components?.c2, { state: "ok", message: "Integration API" });
});

Deno.test("service.check: a degraded, uncovered component does not sink covered ones, but is reported", async () => {
  const body = summary({
    indicator: "minor",
    components: [
      { id: "c1", name: "Marketplace API", status: "operational" },
      { id: "c2", name: "Integration API", status: "operational" },
      { id: "c5", name: "Image Storage - AWS S3", status: "degraded_performance" },
    ],
  });
  const { ctx } = mockCtx([{ status: 200, body }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components?.c5.state, "degraded");
  assertEquals(result.components?.c5.message?.includes("not part of this app's API surface"), true);
  assertEquals(result.components?.c1.message, "Marketplace API");
});

Deno.test("service.check: a non-2xx status page response is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service.check: a page that stops self-identifying as Sharetribe's is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary({ pageUrl: "https://status.example.com" }),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: status.sharetribe.com is allowlisted for this hook only, and needs no credential", () => {
  assertEquals(service.network?.allow, ["status.sharetribe.com"]);
  assertEquals(service.credential, "none");
});
