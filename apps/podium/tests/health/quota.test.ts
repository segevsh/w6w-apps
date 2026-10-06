import { assertEquals } from "@std/assert";
import quota, { headroom } from "../../health/quota.ts";
import { API, mockCtx } from "../_helpers.ts";

Deno.test("quota: informational, signed, connection-scoped", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});

Deno.test("quota: reads ratelimit-* headers from the scope-free webhooks list", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [] },
    headers: { "ratelimit-limit": "300", "ratelimit-remaining": "299", "ratelimit-reset": "30" },
  }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, `${API}/webhooks`);
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0].limit, 300);
  assertEquals(r.quota?.[0].remaining, 299);
  assertEquals(typeof r.quota?.[0].resetAt, "string");
});

Deno.test("quota: falls back to the per-minute x-ratelimit headers", async () => {
  const { ctx } = mockCtx([{
    body: { data: [] },
    headers: { "x-ratelimit-limit-minute": "300", "x-ratelimit-remaining-minute": "10" },
  }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.quota?.[0].remaining, 10);
});

Deno.test("quota: no headers is unknown, not a guess", async () => {
  const r = await quota.check!({} as never, mockCtx([{ body: { data: [] } }]).ctx);
  assertEquals(r.state, "unknown");
});

Deno.test("quota: headroom thresholds", () => {
  assertEquals(headroom(0, 300), "down");
  assertEquals(headroom(29, 300), "degraded");
  assertEquals(headroom(30, 300), "ok");
  assertEquals(headroom(undefined, 300), "unknown");
});
