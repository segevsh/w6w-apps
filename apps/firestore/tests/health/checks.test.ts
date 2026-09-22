import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

/**
 * Firestore is a Google *Cloud* product: the Workspace dashboard (the google-*
 * apps) and the Ads dashboard are both the wrong surface.
 */
Deno.test("service: probes the Google Cloud dashboard for Cloud Firestore", () => {
  assertEquals(service.network?.allow, ["status.cloud.google.com"]);
  assertEquals(service.kind, "service");
  assertEquals(service.credential, undefined);
});

Deno.test("service: no open Cloud Firestore incident is ok", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [
      // A closed incident is history.
      { service_name: "Cloud Firestore", status_impact: "SERVICE_OUTAGE", end: "2026-01-01" },
      // Another product's live incident is not ours.
      { service_name: "Cloud SQL", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.cloud.google.com/incidents.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, { "cloud-firestore": { state: "ok" } });
});

Deno.test("service: an open Firestore outage is down, with the description", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: "Cloud Firestore",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "Reads are failing in eur3",
    }],
  }]);
  const result = await service.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "down");
  assertEquals(result.message, "Reads are failing in eur3");
});

/** A multi-product incident names its products in affected_products[]. */
Deno.test("service: a multi-product incident is caught via affected_products", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: "Multiple Products",
      status_impact: "SERVICE_DISRUPTION",
      affected_products: [{ title: "Cloud Run" }, { title: "Cloud Firestore" }],
    }],
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "degraded");
});

/** A sibling product is a separate service this app does not call. */
Deno.test("service: an incident confined to Cloud Datastore/Filestore is not ours", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [
      { service_name: "Cloud Filestore", status_impact: "SERVICE_OUTAGE" },
      { service_name: "Datastore", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  assertEquals((await service.check!({} as never, ctx)).state, "ok");
});

Deno.test("service: a broken dashboard is unknown, never down", async () => {
  const failed = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, failed.ctx)).state, "unknown");
  const weird = mockCtx([{ status: 200, body: { not: "an array" } }]);
  assertEquals((await service.check!({} as never, weird.ctx)).state, "unknown");
});

Deno.test("quota: is a declared absence, and never worsens a roll-up", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason.includes("RESOURCE_EXHAUSTED"));
  assert(quota.unavailable?.reason.includes("headroom"));
});
