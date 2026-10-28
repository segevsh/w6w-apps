import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

Deno.test("service: declared as an unsigned, app-scoped vendor-status probe", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  // The status host is widened for this hook only — it is deliberately NOT on
  // the app's egress allowlist, so no action can reach it.
  assertEquals(service.network?.allow, ["www.google.com"]);
  assertEquals(service.minIntervalSeconds, 120);
});

Deno.test("service: reports ok when no Google Chat incident is open", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      {
        service_name: "Google Chat",
        status_impact: "SERVICE_OUTAGE",
        end: "2026-07-01T00:00:00Z",
      },
      { service_name: "Google Meet", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://www.google.com/appsstatus/dashboard/incidents.json");
});

Deno.test("service: an open Google Chat outage is down", async () => {
  const { ctx } = mockCtx([{
    body: [{
      service_name: "Google Chat",
      status_impact: "SERVICE_OUTAGE",
      external_desc: "Chat is unavailable",
    }],
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assert((out.message ?? "").includes("Chat is unavailable"));
});

Deno.test("service: a disruption is degraded, and an info notice is ok", async () => {
  const { ctx } = mockCtx([
    { body: [{ service_name: "Google Chat", status_impact: "SERVICE_DISRUPTION" }] },
    { body: [{ service_name: "Google Chat", status_impact: "SERVICE_INFORMATION" }] },
  ]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: another Workspace product's outage is not a Chat outage", async () => {
  const { ctx } = mockCtx([{
    body: [{ service_name: "Google Meet", status_impact: "SERVICE_OUTAGE" }],
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: the retired Classic Hangouts product is not matched", async () => {
  // It is a separate entry in the dashboard's products.json and its incidents
  // say nothing about Google Chat.
  const { ctx } = mockCtx([{
    body: [{ service_name: "Classic Hangouts", status_impact: "SERVICE_OUTAGE" }],
  }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: takes the worst state across several open Chat incidents", async () => {
  const { ctx } = mockCtx([{
    body: [
      { service_name: "Google Chat", status_impact: "SERVICE_DISRUPTION" },
      { service_name: "Google Chat", status_impact: "SERVICE_OUTAGE" },
    ],
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a broken dashboard is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert((out.message ?? "").includes("503"));
});

Deno.test("service: an unexpected payload shape is unknown", async () => {
  const { ctx } = mockCtx([{ body: { nope: true } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: declared absent and informational, with a stated reason", () => {
  assertEquals(quota.key, "quota");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "undefined");
  assert((quota.unavailable?.reason ?? "").length > 0);
  // The reason cites the documented ceilings rather than hand-waving.
  assert((quota.unavailable?.reason ?? "").includes("429"));
});
