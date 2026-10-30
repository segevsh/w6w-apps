import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota, { readRateLimitHeaders, WINDOW_LIMITS } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/** The exact header set measured live on 2026-09-01 against GET /v3/whoami. */
function rateLimitHeaders(overrides: Record<string, string> = {}) {
  return {
    "content-type": "application/json",
    "x-rate-limit-limit": "1h",
    "x-rate-limit-remaining": "2999",
    "x-rate-limit-reset": "2026-09-01T22:00:00.0000000Z",
    ...overrides,
  };
}

test("quota: probes whoami, signed, connection-scoped", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.kind, "quota");
});

test("quota: WINDOW_LIMITS matches the documented 100/minute, 3,000/hour ceilings", () => {
  assertEquals(WINDOW_LIMITS["1m"], 100);
  assertEquals(WINDOW_LIMITS["1h"], 3000);
});

test("quota: a healthy window reports ok with the reading", async () => {
  const { ctx, calls } = mockCtx([{ headers: rateLimitHeaders(), body: { userId: 1 } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/whoami");
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [
    {
      id: "1h",
      unit: "requests",
      remaining: 2999,
      limit: 3000,
      resetAt: "2026-09-01T22:00:00.0000000Z",
    },
  ]);
});

test("quota: near-exhaustion (>=90% consumed) reports degraded", async () => {
  const { ctx } = mockCtx([{ headers: rateLimitHeaders({ "x-rate-limit-remaining": "250" }) }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(/250\/3000/.test(report.message ?? ""), report.message);
});

test("quota: zero remaining reports degraded, not down (it recovers on its own)", async () => {
  const { ctx } = mockCtx([{ headers: rateLimitHeaders({ "x-rate-limit-remaining": "0" }) }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

test("quota: no x-rate-limit-remaining header reports unknown", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("quota: an unrecognised window label reports remaining without a limit", () => {
  const headers = new Headers({ "x-rate-limit-remaining": "42", "x-rate-limit-limit": "1d" });
  const reading = readRateLimitHeaders(headers);
  assertEquals(reading?.quota.limit, undefined);
  assertEquals(reading?.quota.remaining, 42);
  assertEquals(reading?.state, "ok");
});

test("readRateLimitHeaders: returns undefined with no remaining header", () => {
  assertEquals(readRateLimitHeaders(new Headers()), undefined);
});
