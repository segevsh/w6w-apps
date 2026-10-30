import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota, { readUserRateLimit, stateFor } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

test("readUserRateLimit: reads all three headers and converts the epoch reset", () => {
  const headers = new Headers({
    "x-ratelimit-user-limit": "600",
    "x-ratelimit-user-remaining": "599",
    "x-ratelimit-user-reset": "1700000000",
  });
  const reading = readUserRateLimit(headers);
  assertEquals(reading.limit, 600);
  assertEquals(reading.remaining, 599);
  assertEquals(reading.resetAt, new Date(1700000000 * 1000).toISOString());
});

test("readUserRateLimit: absent headers read as undefined, not zero", () => {
  const reading = readUserRateLimit(new Headers());
  assertEquals(reading.limit, undefined);
  assertEquals(reading.remaining, undefined);
  assertEquals(reading.resetAt, undefined);
});

test("stateFor: unknown when the headers never arrived", () => {
  assertEquals(stateFor({}).state, "unknown");
});

test("stateFor: ok comfortably above the warn threshold", () => {
  assertEquals(stateFor({ limit: 600, remaining: 590 }).state, "ok");
});

test("stateFor: degraded at or below the 10% warn threshold", () => {
  assertEquals(stateFor({ limit: 600, remaining: 60 }).state, "degraded");
  assertEquals(stateFor({ limit: 600, remaining: 1 }).state, "degraded");
});

test("stateFor: down when the budget is exhausted, not merely degraded", () => {
  const result = stateFor({ limit: 600, remaining: 0 });
  assertEquals(result.state, "down");
});

test("quota check: reads the headers off GET /v2/me and reports a quota entry", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 1 },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-user-limit": "600",
      "x-ratelimit-user-remaining": "600",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/me");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], { id: "user", limit: 600, remaining: 600, unit: "requests" });
});

test("quota check: a rejected credential is unknown, not degraded/down", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "UNAUTHORIZED", message: "Invalid or missing API key." } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("quota check: unsigned egress is never widened — it reuses the app's own host", () => {
  assertEquals(quota.network, undefined);
  assertEquals(quota.credential, "signed");
});
