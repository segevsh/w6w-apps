import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota, { resetAtFrom } from "../../health/quota.ts";

const headers = (remaining: number, limit = 100, reset?: string) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": String(limit),
  "x-ratelimit-remaining": String(remaining),
  ...(reset === undefined ? {} : { "x-ratelimit-reset": reset }),
});

Deno.test("quota: is informational and signed on the app's own egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  // A signed check must not widen the allowlist.
  assertEquals(quota.network, undefined);
});

/**
 * Vercel documents the header but never its unit, and an unauthenticated call
 * carries no `x-ratelimit-*` at all, so the unit could not be settled by
 * observation either. All three readings are handled rather than one guessed.
 */
Deno.test("quota: X-RateLimit-Reset is classified by magnitude, not assumed", () => {
  const now = Date.UTC(2026, 7, 18, 2, 0, 0);
  // epoch milliseconds
  assertEquals(resetAtFrom(1787022000000, now), "2026-08-18T03:00:00.000Z");
  // epoch seconds
  assertEquals(resetAtFrom(1787022000, now), "2026-08-18T03:00:00.000Z");
  // a delay in seconds from now
  assertEquals(resetAtFrom(3600, now), "2026-08-18T03:00:00.000Z");
  assertEquals(resetAtFrom(undefined, now), undefined);
  assertEquals(resetAtFrom(0, now), undefined);
});

Deno.test("quota: reports the request allowance off the headers", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {},
    headers: headers(97, 100, "1787022000"),
  }], {
    display: {},
  });
  const result = await quota.check!({} as never, ctx) as {
    state: string;
    quota: Array<Record<string, unknown>>;
  };
  assertEquals(calls[0].url, "https://api.vercel.com/v2/user");
  assertEquals(result.state, "ok");
  assertEquals(result.quota[0].limit, 100);
  assertEquals(result.quota[0].remaining, 97);
  assertEquals(result.quota[0].resetAt, "2026-08-18T03:00:00.000Z");
});

Deno.test("quota: under 10% headroom degrades, and exhaustion is down", async () => {
  const low = mockCtx([{ status: 200, body: {}, headers: headers(5) }], { display: {} });
  assertEquals((await quota.check!({} as never, low.ctx) as { state: string }).state, "degraded");
  const out = mockCtx([{ status: 429, body: "", headers: headers(0) }], { display: {} });
  assertEquals((await quota.check!({} as never, out.ctx) as { state: string }).state, "down");
});

Deno.test("quota: no headers is unknown, and says which kind of nothing it got", async () => {
  const ok = mockCtx([{ status: 200, body: {} }], { display: {} });
  const a = await quota.check!({} as never, ok.ctx) as { state: string; message: string };
  assertEquals(a.state, "unknown");
  assertEquals(a.message, "response carried no x-ratelimit-* headers");

  const failed = mockCtx([{ status: 403, body: "" }], { display: {} });
  const b = await quota.check!({} as never, failed.ctx) as { state: string; message: string };
  assertEquals(b.state, "unknown");
  assertEquals(b.message, "quota probe returned 403");
});
