import { assertEquals } from "@std/assert";
import quota, { headroom } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const headers = (limit: string, remaining: string, reset?: string) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
  ...(reset ? { "x-ratelimit-reset": reset } : {}),
});

Deno.test("quota: ok with plenty of headroom, probing GET /store/info", async () => {
  const { ctx, calls } = mockCtx([{ body: {}, headers: headers("120", "119", "1788624960") }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://api.salla.dev/admin/v2/store/info");
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0].limit, 120);
  assertEquals(r.quota?.[0].remaining, 119);
  assertEquals(r.quota?.[0].resetAt, new Date(1788624960 * 1000).toISOString());
});

Deno.test("quota: degraded under 10% and down at zero", async () => {
  const a = mockCtx([{ body: {}, headers: headers("120", "11") }]);
  assertEquals((await quota.check!({} as never, a.ctx)).state, "degraded");
  const b = mockCtx([{ status: 429, body: {}, headers: headers("120", "0") }]);
  assertEquals((await quota.check!({} as never, b.ctx)).state, "down");
});

Deno.test("quota: no header is unknown with the HTTP status in the message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const r = await quota.check!({} as never, ctx);
  assertEquals(r.state, "unknown");
  assertEquals(r.message, "response carried no X-RateLimit-Remaining header (HTTP 401)");
});

Deno.test("headroom: boundaries", () => {
  assertEquals(headroom(undefined, 120), "unknown");
  assertEquals(headroom(0, 120), "down");
  assertEquals(headroom(12, 120), "ok");
  assertEquals(headroom(11, 120), "degraded");
  assertEquals(headroom(5, undefined), "ok");
});

Deno.test("quota: is informational and signed", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
});
