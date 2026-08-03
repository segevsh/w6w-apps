import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota, { parseIntHeader, quotaState } from "../../health/quota.ts";

const rateHeaders = (limit: string, remaining: string, extra: Record<string, string> = {}) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
  "x-ratelimit-window": "10",
  "x-ratelimit-context": "global",
  ...extra,
});

Deno.test("quota: signed, connection-scoped, informational, and widens no egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential ?? "signed", "signed");
  assertEquals(quota.scope ?? "connection", "connection");
  // Running low is worth showing and never worth failing a verdict over.
  assertEquals(quota.severity, "informational");
  // A signed check may not widen egress — the probe stays on the app's own host.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: probes /identity, not /me", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: rateHeaders("250", "200"), body: {} }]);
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/identity");
});

Deno.test("quota: reads the documented X-RateLimit headers into a reading", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: rateHeaders("250", "156"), body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "global", limit: 250, remaining: 156, unit: "requests" }]);
  assert(report.message?.includes("156/250"), report.message);
  assert(report.message?.includes("global"), report.message);
  assert(report.message?.includes("10s"), report.message);
});

/**
 * `resetAt` is deliberately never set: the limit is a SLIDING window, so there
 * is no instant at which the allowance resets, and synthesising one would invent
 * a precise-looking fact.
 */
Deno.test("quota: never fabricates a resetAt for a sliding window", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: rateHeaders("250", "156"), body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota?.[0].resetAt, undefined);
});

Deno.test("quota: low headroom degrades, near-zero reads as down", async () => {
  const low = mockCtx([{ status: 200, headers: rateHeaders("250", "20"), body: {} }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const empty = mockCtx([{ status: 200, headers: rateHeaders("250", "1"), body: {} }]);
  assertEquals((await quota.check!({}, empty.ctx)).state, "down");
});

/**
 * The honesty requirement: a missing header must never read as full headroom.
 * The wire behaviour of these headers could not be verified without an account,
 * so this is the path that matters most if the docs turn out to be wrong.
 */
Deno.test("quota: absent rate-limit headers report unknown, never ok", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: { "content-type": "application/json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("X-RateLimit"), report.message);
  assertEquals(report.quota, undefined);
});

Deno.test("quota: an unparseable header reads as unknown, not as zero", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: rateHeaders("not-a-number", "also-not"),
    body: {},
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

/** A 429 is a positive reading — being throttled is exactly what this reports. */
Deno.test("quota: a 429 reports down and surfaces Retry-After", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: rateHeaders("250", "0", { "retry-after": "8" }),
    body: {},
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("retry after 8s"), report.message);
  assert(report.message?.includes("global"), report.message);
  assertEquals(report.quota?.[0].remaining, 0);
});

/**
 * A 401/403 is a credential story, and the derived `auth:api-key` check is the
 * one that reports it. A probe that could not run says nothing about headroom.
 */
Deno.test("quota: a non-429 failure reports unknown, not down", async () => {
  for (const status of [401, 403, 500]) {
    const { ctx } = mockCtx([{ status, body: {} }]);
    const report = await quota.check!({}, ctx);
    assertEquals(report.state, "unknown", `status ${status}`);
    assert(report.message?.includes(String(status)), report.message);
  }
});

Deno.test("quota: reports whichever context the API says applied", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { ...rateHeaders("10", "9"), "x-ratelimit-context": "notes" },
    body: {},
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota?.[0].id, "notes");
  assert(report.message?.includes("notes"), report.message);
});

// --- helpers ---------------------------------------------------------------

Deno.test("parseIntHeader: distinguishes absent from zero", () => {
  assertEquals(parseIntHeader("0"), 0);
  assertEquals(parseIntHeader(null), undefined);
  assertEquals(parseIntHeader(undefined), undefined);
  assertEquals(parseIntHeader("  "), undefined);
  assertEquals(parseIntHeader("abc"), undefined);
  assertEquals(parseIntHeader("250"), 250);
});

Deno.test("quotaState: thresholds", () => {
  assertEquals(quotaState(250, 250), "ok");
  assertEquals(quotaState(38, 250), "ok");
  assertEquals(quotaState(30, 250), "degraded");
  assertEquals(quotaState(5, 250), "down");
  assertEquals(quotaState(0, 250), "down");
  // A nonsensical limit cannot yield a fraction worth reporting.
  assertEquals(quotaState(0, 0), "unknown");
});
