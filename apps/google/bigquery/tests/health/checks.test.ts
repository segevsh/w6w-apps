import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

/**
 * Three Google status surfaces exist and this app must use the Cloud one —
 * Workspace for the nine google-* apps, Ads for google-analytics, Cloud here.
 */
Deno.test("service: probes the Google CLOUD dashboard", () => {
  assertEquals(service.network?.allow, ["status.cloud.google.com"]);
  assertEquals(service.kind, "service");
});

Deno.test("service: no open BigQuery incident is ok", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [
      // closed incidents are history
      { service_name: "Google BigQuery", status_impact: "SERVICE_OUTAGE", end: "2026-01-01" },
      // another product's live incident is not ours
      { service_name: "Cloud SQL", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.cloud.google.com/incidents.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, { "google-bigquery": { state: "ok" } });
});

Deno.test("service: an open BigQuery outage is down, with the description", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: "Google BigQuery",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "Queries are failing in us-central1",
    }],
  }]);
  const result = await service.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "down");
  assertEquals(result.message, "Queries are failing in us-central1");
});

/** A multi-product incident names its products in affected_products. */
Deno.test("service: a multi-product incident is caught via affected_products", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: "Multiple Products",
      status_impact: "SERVICE_DISRUPTION",
      affected_products: [{ title: "Cloud Storage" }, { title: "Google BigQuery" }],
    }],
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "degraded");
});

/** The Data Transfer Service is a separate product this app does not call. */
Deno.test("service: an incident confined to BigQuery Data Transfer is not ours", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ service_name: "BigQuery Data Transfer Service", status_impact: "SERVICE_OUTAGE" }],
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "ok");
});

Deno.test("service: a broken dashboard is unknown, never down", async () => {
  const failed = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, failed.ctx)).state, "unknown");
  const weird = mockCtx([{ status: 200, body: { not: "an array" } }]);
  assertEquals((await service.check!({} as never, weird.ctx)).state, "unknown");
});

Deno.test("quota: is a declared absence — cost is knowable, headroom is not", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason.includes("totalBytesProcessed"));
  assert(quota.unavailable?.reason.includes("quotaExceeded"));
  assertEquals(quota.severity, "informational");
});
