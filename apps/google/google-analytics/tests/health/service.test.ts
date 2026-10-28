import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: probes the ADS dashboard, which is where Google lists Analytics", () => {
  // Verified 2026-08-18: the Workspace products.json has no Analytics entry;
  // the Ads one does. Reusing the Workspace feed here would look consistent
  // with the other google-* apps and be silently wrong.
  assertEquals(service.network?.allow, ["ads.google.com"]);
  assertEquals(service.kind, "service");
});

Deno.test("service: no open incident is ok", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [
      // closed incidents are history
      { service_name: "Google Analytics", status_impact: "SERVICE_OUTAGE", end: "2026-01-01" },
      // a different product's live incident is not ours
      { service_name: "AdSense", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://ads.google.com/status/publisher/incidents.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, { "google-analytics": { state: "ok" } });
});

Deno.test("service: an open Analytics outage is down, with the description", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      // leading space: the feed really does this
      service_name: " Google Analytics",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "Reporting is unavailable",
    }],
  }]);
  const result = await service.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "down");
  assertEquals(result.message, "Reporting is unavailable");
});

Deno.test("service: a Multiple Products incident is caught via affected_products", async () => {
  // Matching only `service_name` would miss exactly the broad outages that
  // matter most.
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: "Multiple Products",
      status_impact: "SERVICE_DISRUPTION",
      affected_products: [{ title: "Google Ads" }, { title: "Google Analytics" }],
    }],
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("service: a broken dashboard is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");

  const weird = mockCtx([{ status: 200, body: { not: "an array" } }]);
  assertEquals((await service.check!({} as never, weird.ctx)).state, "unknown");
});
