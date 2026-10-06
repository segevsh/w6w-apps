import { assertEquals } from "@std/assert";
import check, { headroom } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const H = (h: Record<string, string>) => ({ "content-type": "application/json", ...h });

Deno.test("quota: signed, connection-scoped, informational, no egress widening", () => {
  assertEquals(check.kind, "quota");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "signed");
  assertEquals(check.severity, "informational");
  assertEquals(check.network, undefined);
});

Deno.test("quota: reads daily and per-minute buckets from headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [] },
    headers: H({
      "x-apiquota-remaining": "950",
      "x-apiquota-reset": "2026-10-07T00:00:00Z",
      "x-ratelimit-remaining": "55",
      "x-ratelimit-limit": "60",
    }),
  }]);
  const r = await check.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/domains");
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [
    { id: "daily", remaining: 950, resetAt: "2026-10-07T00:00:00.000Z", unit: "requests" },
    { id: "per-minute", limit: 60, remaining: 55, unit: "requests" },
  ]);
});

Deno.test("quota: headroom thresholds", async () => {
  assertEquals(headroom(0), "down");
  assertEquals(headroom(10), "degraded");
  assertEquals(headroom(11), "ok");
  const { ctx } = mockCtx([{ body: {}, headers: H({ "x-apiquota-remaining": "3" }) }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: missing header is unknown; 429 is down; other errors are unknown", async () => {
  assertEquals((await check.check!({}, mockCtx([{ body: { data: [] } }]).ctx)).state, "unknown");
  const r = await check.check!(
    {},
    mockCtx([{ status: 429, body: {}, headers: H({ "x-apiquota-remaining": "0" }) }]).ctx,
  );
  assertEquals(r.state, "down");
  assertEquals(r.quota![0].remaining, 0);
  assertEquals((await check.check!({}, mockCtx([{ status: 403, body: {} }]).ctx)).state, "unknown");
});
