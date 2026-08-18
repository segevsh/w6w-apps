import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const display = { endpoint: "https://us.sentry.io", organizationSlug: "acme" };

// The live header set, copied off `us.sentry.io` on 2026-08-18.
const headers = (remaining: number, limit = 40) => ({
  "content-type": "application/json",
  "x-sentry-rate-limit-limit": String(limit),
  "x-sentry-rate-limit-remaining": String(remaining),
  "x-sentry-rate-limit-reset": "1787019075",
  "x-sentry-rate-limit-concurrentlimit": "25",
  "x-sentry-rate-limit-concurrentremaining": "24",
});

Deno.test("quota: is informational and signed on the app's own egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  // A signed check must not widen the allowlist.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: reports both the request and the concurrency allowance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {}, headers: headers(39) }], { display });
  const result = await quota.check!({} as never, ctx) as {
    state: string;
    quota: Array<Record<string, unknown>>;
  };
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/?detailed=0");
  assertEquals(result.state, "ok");
  assertEquals(result.quota[0], {
    id: "requests",
    limit: 40,
    remaining: 39,
    // epoch SECONDS, not a duration — converted directly.
    resetAt: "2026-08-18T02:11:15.000Z",
    unit: "requests",
  });
  assertEquals(result.quota[1].id, "concurrent");
  assertEquals(result.quota[1].remaining, 24);
});

Deno.test("quota: under 10% headroom degrades, and exhaustion is down", async () => {
  const low = mockCtx([{ status: 200, body: {}, headers: headers(3) }], { display });
  assertEquals((await quota.check!({} as never, low.ctx) as { state: string }).state, "degraded");
  const out = mockCtx([{ status: 200, body: {}, headers: headers(0) }], { display });
  assertEquals((await quota.check!({} as never, out.ctx) as { state: string }).state, "down");
});

Deno.test("quota: the headers are read even off a 429, which is when they matter most", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "", headers: headers(0) }], { display });
  assertEquals((await quota.check!({} as never, ctx) as { state: string }).state, "down");
});

Deno.test("quota: no headers, or no org on the connection, is unknown", async () => {
  const bare = mockCtx([{ status: 200, body: {} }], { display });
  const noHeaders = await quota.check!({} as never, bare.ctx) as { state: string; message: string };
  assertEquals(noHeaders.state, "unknown");
  assertEquals(noHeaders.message, "response carried no x-sentry-rate-limit-* headers");

  const noOrg = mockCtx([], { display: { endpoint: "https://us.sentry.io" } });
  const result = await quota.check!({} as never, noOrg.ctx) as { state: string; message: string };
  assertEquals(result.state, "unknown");
  assertEquals(result.message, "connection records no organization slug");
  assertEquals(noOrg.calls.length, 0);
});
