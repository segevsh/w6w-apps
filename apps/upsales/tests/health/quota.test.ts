import { assert, assertEquals } from "@std/assert";
import quota, { PROBE_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

function rl(limit: string, remaining: string, reset = "10") {
  return {
    "content-type": "application/json",
    "x-ratelimit-limit": limit,
    "x-ratelimit-remaining": remaining,
    "x-ratelimit-reset": reset,
  };
}

Deno.test("quota: plenty left is ok and reports the bucket", async () => {
  const { ctx, calls } = mockCtx([{ headers: rl("200", "150"), body: { data: { id: 1 } } }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(r.state, "ok");
  const q = r.quota![0];
  assertEquals([q.limit, q.remaining, q.unit], [200, 150, "requests"]);
  assert(q.resetAt && !Number.isNaN(Date.parse(q.resetAt)));
});

Deno.test("quota: under 10% is degraded, zero is down", async () => {
  const low = await quota.check!({}, mockCtx([{ headers: rl("200", "10"), body: {} }]).ctx);
  assertEquals(low.state, "degraded");
  const none = await quota.check!(
    {},
    mockCtx([{ status: 429, headers: rl("200", "0"), body: {} }]).ctx,
  );
  assertEquals(none.state, "down");
  assertEquals(none.quota![0].remaining, 0);
});

Deno.test("quota: missing or non-numeric headers are unknown", async () => {
  assertEquals((await quota.check!({}, mockCtx([{ body: {} }]).ctx)).state, "unknown");
  const bad = await quota.check!({}, mockCtx([{ headers: rl("abc", "x"), body: {} }]).ctx);
  assertEquals(bad.state, "unknown");
});

Deno.test("quota: is a signed connection-scoped check", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
