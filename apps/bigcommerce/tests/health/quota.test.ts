import { assert, assertEquals } from "@std/assert";
import quota, { CRITICAL_FRACTION, quotaState, WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx, pathOf, rateLimitHeaders } from "../_helpers.ts";

Deno.test("health/quota: is signed, connection-scoped and widens no egress", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.kind, "quota");
  // The spec forbids pairing `network.allow` with a signed posture.
  assertEquals(quota.network, undefined);
});

Deno.test("health/quota: the arithmetic thresholds", () => {
  assertEquals(quotaState(150, 150), "ok");
  assertEquals(quotaState(Math.ceil(WARN_FRACTION * 150) + 1, 150), "ok");
  assertEquals(quotaState(Math.floor(WARN_FRACTION * 150), 150), "degraded");
  assertEquals(quotaState(Math.floor(CRITICAL_FRACTION * 150), 150), "down");
  assertEquals(quotaState(0, 150), "down");
  // A zero ceiling is "not metered", not "exhausted".
  assertEquals(quotaState(0, 0), "ok");
});

Deno.test("health/quota: reads the headers off the cheapest endpoint in the API", async () => {
  const { ctx, calls } = mockCtx([{ body: { time: 1 }, headers: rateLimitHeaders(120) }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/time");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 1);
  assertEquals(report.quota?.[0].limit, 150);
  assertEquals(report.quota?.[0].remaining, 120);
  assertEquals(report.quota?.[0].unit, "requests");
  assert(report.quota?.[0].resetAt, "no resetAt derived from the reset-ms header");
});

Deno.test("health/quota: a nearly-spent window degrades and says so", async () => {
  const { ctx } = mockCtx([{ body: { time: 1 }, headers: rateLimitHeaders(20) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("20/150 requests left"), report.message);
  assert(report.message?.includes("30s window"), report.message);
});

Deno.test("health/quota: a 429 is READ, not treated as a failed probe", async () => {
  // The 429 response still carries the headers, so it is the most informative
  // answer this check can get.
  const { ctx } = mockCtx([{ status: 429, body: "", headers: rateLimitHeaders(0) }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota?.[0].remaining, 0);
  assert(report.message?.includes("the probe itself was rate-limited"), report.message);
});

Deno.test("health/quota: absent headers are `unknown`, not zero headroom", async () => {
  // An Enterprise Unlimited Rate Plan store has no request rate limit at all.
  const { ctx } = mockCtx([{ body: { time: 1 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("Unlimited Rate Plan"), report.message);
  assertEquals(report.quota, undefined);
});

Deno.test("health/quota: any other failure is `unknown`", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("health/quota: without a store hash it reports unknown and makes no request", async () => {
  const { ctx } = mockCtx([], { storeHash: null });
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
