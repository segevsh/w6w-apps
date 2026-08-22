import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const page = (over: Record<string, string> = {}) => ({
  components: [
    "API",
    "Video Delivery",
    "Live Streaming",
    "Something Else",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

Deno.test("service: all green reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
  assertEquals(new URL(calls[0].url).host, "status.mux.com");
});

/**
 * The API and delivery fail independently, and a workflow that only ingests is
 * unaffected by a playback incident.
 */
Deno.test("service: an API-only outage is degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ API: "major_outage" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a delivery-only outage is degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Video Delivery": "major_outage" }) }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: both halves out is down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: page({ API: "major_outage", "Video Delivery": "major_outage" }),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: unrelated components are ignored", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ "Something Else": "major_outage" }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components!["something-else"], undefined);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: reads whatever rate-limit headers arrive", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "900",
      "x-ratelimit-reset": "1787054400",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota![0].remaining, 900);
});

Deno.test("quota: a nearly-empty allowance is degraded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "10",
    },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

/** No headers is an answer, not a fault. */
Deno.test("quota: no headers reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(/no rate-limit headers/.test(out.message!), out.message);
});

Deno.test("quota: headroom is informational", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.kind, "quota");
});
