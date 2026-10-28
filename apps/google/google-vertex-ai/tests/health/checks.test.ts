import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";

Deno.test("quota: declared unavailable, informational", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 0);
});

Deno.test("service: probes the Google CLOUD dashboard from its own allowlist", () => {
  assertEquals(service.network?.allow, ["status.cloud.google.com"]);
  assertEquals(service.kind, "service");
});

Deno.test("service: no open Vertex incident is ok; closed and other-product ones are ignored", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [
      { service_name: "Vertex Gemini API", status_impact: "SERVICE_OUTAGE", end: "2026-01-01" },
      { service_name: "Cloud SQL", status_impact: "SERVICE_OUTAGE" },
      // a Vertex product this app never calls
      { service_name: "Vertex AI Pipelines", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://status.cloud.google.com/incidents.json");
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!).sort(), [
    "vertex-ai-batch-prediction",
    "vertex-ai-model-registry",
    "vertex-ai-online-prediction",
    "vertex-gemini-api",
  ]);
});

Deno.test("service: an open Gemini outage is down; the renamed title matches too", async () => {
  for (const name of ["Vertex Gemini API", "Gemini on Agent Platform"]) {
    const { ctx } = mockCtx([{
      status: 200,
      body: [{
        service_name: name,
        status_impact: "SERVICE_OUTAGE",
        external_desc: "Gemini is failing",
      }],
    }]);
    const r = await service.check!({} as never, ctx) as {
      state: string;
      message: string;
      components: Record<string, { state: string }>;
    };
    assertEquals(r.state, "down");
    assertEquals(r.message, "Gemini is failing");
    assertEquals(r.components["vertex-gemini-api"], { state: "down" });
    assertEquals(r.components["vertex-ai-online-prediction"], { state: "ok" });
  }
});

Deno.test("service: a multi-product incident is caught via affected_products (either title)", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{
      service_name: "Multiple Products",
      status_impact: "SERVICE_DISRUPTION",
      affected_products: [{ title: "Apigee" }, { title: "Vertex AI Online Prediction" }],
    }, {
      service_name: "Multiple Products",
      status_impact: "SERVICE_DISRUPTION",
      affected_products: [{ title: "x", current_title: "Agent Platform Batch Inference" }],
    }],
  }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.components!["vertex-ai-online-prediction"], { state: "degraded" });
  assertEquals(r.components!["vertex-ai-batch-prediction"], { state: "degraded" });
});

Deno.test("service: a failing or malformed dashboard is unknown, never down", async () => {
  assertEquals(
    (await service.check!({} as never, mockCtx([{ status: 503, body: {} }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({} as never, mockCtx([{ body: { not: "an array" } }]).ctx)).state,
    "unknown",
  );
});
