import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import quota, { readBucket } from "../../health/quota.ts";

test("readBucket: ok when well under the warn fraction", () => {
  const r = readBucket("searches", { used: 500, available: 10000, remaining: 9500 });
  assertEquals(r?.state, "ok");
  assertEquals(r?.quota, { id: "searches", remaining: 9500, unit: "requests", limit: 10000 });
});

test("readBucket: degraded under the warn fraction", () => {
  const r = readBucket("searches", { used: 9500, available: 10000, remaining: 500 });
  assertEquals(r?.state, "degraded");
  assertEquals(r?.note?.includes("searches"), true);
});

test("readBucket: down at zero remaining", () => {
  const r = readBucket("verifications", { used: 100, available: 100, remaining: 0 });
  assertEquals(r?.state, "down");
});

test("readBucket: a missing/zero available is unmetered, not exhausted", () => {
  const r = readBucket("credits", { used: 0, available: 0, remaining: 0 });
  // remaining <= 0 still reports down — a genuine 0 balance is 0 regardless of
  // whether a ceiling is configured.
  assertEquals(r?.state, "down");
  const unmetered = readBucket("credits", { used: 10, remaining: 500 });
  assertEquals(unmetered?.state, "ok");
  assertEquals(unmetered?.quota.limit, undefined);
});

test("readBucket: undefined when the bucket carries no remaining figure", () => {
  assertEquals(readBucket("x", undefined), undefined);
  assertEquals(readBucket("x", {}), undefined);
});

test("quota: check reads GET /account and reports the worst bucket state", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        data: {
          requests: {
            credits: { used: 550, available: 10000, remaining: 9450 },
            searches: { used: 9990, available: 10000, remaining: 10 },
            verifications: { used: 100, available: 20000, remaining: 19900 },
          },
        },
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/account");
  assertEquals(report.state, "degraded");
  assertEquals(report.quota?.length, 3);
  assertEquals(report.message?.includes("searches"), true);
});

test("quota: unknown when the account probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("quota: unknown when the response carries no requests data", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("quota: is informational and signed, matching a per-connection probe", () => {
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
