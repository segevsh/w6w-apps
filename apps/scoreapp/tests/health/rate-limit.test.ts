import { assert, assertEquals } from "@std/assert";
import rateLimit, {
  RATE_LIMIT_URL,
  readRateLimitHeaders,
  stateFor,
  WARN_FRACTION,
} from "../../health/rate-limit.ts";
import { mockCtx, rateLimitHeaders } from "../_helpers.ts";

Deno.test("rate-limit: probes the same signed call the credential probe makes", () => {
  assertEquals(RATE_LIMIT_URL, "https://open-api.scoreapp.com/scorecards?limit=1");
  assertEquals(rateLimit.kind, "quota");
  assertEquals(rateLimit.scope, "connection");
  assertEquals(rateLimit.credential, "signed");
  assertEquals(rateLimit.minIntervalSeconds, 60);
  // A signed check must not widen egress — that pairing is banned by the spec.
  assertEquals(rateLimit.network, undefined);
});

Deno.test("rate-limit: reads both headers off a response", () => {
  const reading = readRateLimitHeaders(new Headers(rateLimitHeaders(120, 114)));

  assertEquals(reading, { limit: 120, remaining: 114 });
});

Deno.test("rate-limit: an unparseable or absent header is undefined, never a guess", () => {
  assertEquals(readRateLimitHeaders(new Headers({ "x-ratelimit-limit": "lots" })), {
    limit: undefined,
    remaining: undefined,
  });
  assertEquals(readRateLimitHeaders(new Headers({})), { limit: undefined, remaining: undefined });
  assertEquals(readRateLimitHeaders(new Headers({ "x-ratelimit-remaining": " " })), {
    limit: undefined,
    remaining: undefined,
  });
});

Deno.test("rate-limit: a healthy window reports ok with the reading", async () => {
  const { ctx, calls } = mockCtx([{ headers: rateLimitHeaders(120, 114), body: { data: [] } }]);
  const report = await rateLimit.check!({}, ctx);

  assertEquals(calls[0].url, RATE_LIMIT_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "requests", limit: 120, remaining: 114, unit: "requests" }]);
  assertEquals(report.ttlSeconds, 60);
});

/**
 * No reset header was observed on the wire, so none is reported: a `resetAt`
 * derived from the docs' "per minute" prose would be a guess presented as data.
 */
Deno.test("rate-limit: the quota carries no resetAt", async () => {
  const { ctx } = mockCtx([{ headers: rateLimitHeaders(120, 119), body: { data: [] } }]);
  const report = await rateLimit.check!({}, ctx);

  assertEquals("resetAt" in (report.quota?.[0] ?? {}), false);
});

Deno.test("rate-limit: the live values the vendor actually sends are read as-is", async () => {
  // Measured live 2026-09-22: limit 120 (the docs say 100 — a real doc/wire
  // mismatch), remaining decrementing per request.
  const { ctx } = mockCtx([{ headers: rateLimitHeaders(120, 0), body: { data: [] } }]);
  const report = await rateLimit.check!({}, ctx);

  assertEquals(report.quota?.[0].limit, 120);
  assertEquals(report.state, "degraded");
});

/** A per-minute window refills on its own, so exhaustion is `degraded`, never `down`. */
Deno.test("rate-limit: an exhausted window is degraded, never down", () => {
  assertEquals(stateFor({ limit: 120, remaining: 0 }).state, "degraded");
  assertEquals(stateFor({ limit: 120, remaining: -3 }).state, "degraded");
  assert(/exhausted/.test(stateFor({ limit: 120, remaining: 0 }).message ?? ""));
  assert(/refills/.test(stateFor({ limit: 120, remaining: 0 }).message ?? ""));
});

Deno.test("rate-limit: a window at or past the warning fraction is degraded", async () => {
  const { ctx } = mockCtx([{ headers: rateLimitHeaders(120, 12), body: { data: [] } }]);
  const report = await rateLimit.check!({}, ctx);

  assertEquals(WARN_FRACTION, 0.9);
  assertEquals(report.state, "degraded");
  assert(
    /90% of the request window used \(12\/120 left\)/.test(report.message ?? ""),
    report.message,
  );
});

Deno.test("rate-limit: just below the warning fraction is ok", () => {
  assertEquals(stateFor({ limit: 120, remaining: 13 }).state, "ok");
  // more remaining than the ceiling is not "negative consumption".
  assertEquals(stateFor({ limit: 120, remaining: 200 }).state, "ok");
});

Deno.test("rate-limit: a non-positive ceiling means unconfigured, not exhausted", () => {
  assertEquals(stateFor({ limit: 0, remaining: 0 }).state, "ok");
});

Deno.test("rate-limit: a missing header reports unknown, never a fabricated number", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  const report = await rateLimit.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
  assert(/x-ratelimit-limit/.test(report.message ?? ""), report.message);
});

/**
 * ScoreApp sends these headers even on a 401, but a refused credential says
 * nothing about this connection's headroom — the derived `auth:api-key` check
 * owns that failure.
 */
Deno.test("rate-limit: a refused call reports unknown rather than another bucket's numbers", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: rateLimitHeaders(120, 119), body: "" }]);
  const report = await rateLimit.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
  assert(/401/.test(report.message ?? ""), report.message);
});

Deno.test("rate-limit: a 5xx reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 503, headers: {}, body: "" }]);
  assertEquals((await rateLimit.check!({}, ctx)).state, "unknown");
});
