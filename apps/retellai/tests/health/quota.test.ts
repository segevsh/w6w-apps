import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota, { readConcurrency, WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("quota: reports ok well under the limit", () => {
  const reading = readConcurrency({ current_concurrency: 10, concurrency_limit: 100 });
  assertEquals(reading.state, "ok");
  assertEquals(reading.quota.remaining, 90);
});

test("quota: reports degraded at/above the warn fraction, never down", () => {
  const reading = readConcurrency({
    current_concurrency: Math.ceil(100 * WARN_FRACTION),
    concurrency_limit: 100,
  });
  assertEquals(reading.state, "degraded");
});

test("quota: at the limit is still degraded, not down — the slot recovers on its own", () => {
  const reading = readConcurrency({ current_concurrency: 100, concurrency_limit: 100 });
  assertEquals(reading.state, "degraded");
});

test("quota: burst mode raises the effective ceiling used for the fraction", () => {
  const reading = readConcurrency({
    current_concurrency: 80,
    concurrency_limit: 100,
    concurrency_burst_enabled: true,
    concurrency_burst_limit: 300,
  });
  // 80/100 would be degraded; 80/300 (the real ceiling with burst on) is comfortably ok.
  assertEquals(reading.state, "ok");
  assertEquals(reading.quota.limit, 300);
});

test("quota: burst disabled or zero falls back to the base limit", () => {
  const reading = readConcurrency({
    current_concurrency: 95,
    concurrency_limit: 100,
    concurrency_burst_enabled: false,
    concurrency_burst_limit: 300,
  });
  assertEquals(reading.quota.limit, 100);
  assertEquals(reading.state, "degraded");
});

test("quota: an unreadable response is unknown, not down", () => {
  const reading = readConcurrency({});
  assertEquals(reading.state, "unknown");
});

test("quota: check() reads GET /get-concurrency", async () => {
  const { ctx, calls } = mockCtx([{ body: { current_concurrency: 1, concurrency_limit: 100 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/get-concurrency");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].unit, "concurrent calls");
});

test("quota: check() is unknown, not down, on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
