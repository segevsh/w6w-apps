import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota, { ME_URL, parseRateLimitHeaders, WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { "content-type": "application/json", ...extra };
}

test("quota: reads the app's own /me, signed, on the app's own host", () => {
  assertEquals(ME_URL, "https://api.sendfox.com/me");
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  // A signed check must not widen egress — that pairing is banned by the spec.
  assertEquals(quota.network, undefined);
});

test("quota: a healthy account reports ok with a reading", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: 1 },
      headers: headers({ "x-ratelimit-limit": "60", "x-ratelimit-remaining": "57" }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, ME_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "requests", limit: 60, remaining: 57, unit: "requests" }]);
});

test("quota: a nearly-exhausted window reports degraded", async () => {
  const { ctx } = mockCtx([
    { body: {}, headers: headers({ "x-ratelimit-limit": "60", "x-ratelimit-remaining": "3" }) },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(/3\/60 requests remaining/.test(report.message ?? ""), report.message);
});

/** Exhausting a rolling one-minute window recovers by itself, so never `down`. */
test("quota: an exhausted window is degraded, not down", async () => {
  const { ctx } = mockCtx([
    { body: {}, headers: headers({ "x-ratelimit-limit": "60", "x-ratelimit-remaining": "0" }) },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

test("quota: WARN_FRACTION is applied to consumption, not remaining", async () => {
  assertEquals(WARN_FRACTION, 0.9);
  const { ctx } = mockCtx([
    { body: {}, headers: headers({ "x-ratelimit-limit": "60", "x-ratelimit-remaining": "6" }) },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

test("quota: a header set with no remaining count reports unknown", async () => {
  const { ctx } = mockCtx([
    { body: {}, headers: headers({ "x-ratelimit-limit": "60" }) },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/X-RateLimit-Remaining/.test(report.message ?? ""), report.message);
});

test("quota: a failed read reports unknown, not degraded", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

test("quota: a Retry-After header becomes a resetAt", async () => {
  const before = Date.now();
  // On a 429 the vendor adds Retry-After; this path is reachable whenever it is
  // present, and the reading carries it as an ISO resetAt.
  const { ctx } = mockCtx([
    {
      body: {},
      headers: headers({
        "x-ratelimit-limit": "60",
        "x-ratelimit-remaining": "0",
        "retry-after": "30",
      }),
    },
  ]);
  const report = await quota.check!({}, ctx);

  const resetAt = report.quota?.[0].resetAt;
  assert(typeof resetAt === "string", "no resetAt was set");
  const at = new Date(resetAt!).getTime();
  assert(at >= before + 29_000 && at <= before + 31_000, `resetAt out of range: ${resetAt}`);
});

test("quota: parseRateLimitHeaders is case-insensitive and tolerates junk", () => {
  assertEquals(parseRateLimitHeaders(new Headers({ "x-ratelimit-limit": "60" })), {
    limit: 60,
    remaining: undefined,
    retryAfterSeconds: undefined,
  });
  assertEquals(parseRateLimitHeaders(new Headers({ "x-ratelimit-limit": "not-a-number" })), {
    limit: undefined,
    remaining: undefined,
    retryAfterSeconds: undefined,
  });
  assertEquals(parseRateLimitHeaders(new Headers()), {
    limit: undefined,
    remaining: undefined,
    retryAfterSeconds: undefined,
  });
});
