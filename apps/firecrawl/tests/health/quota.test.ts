import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("quota: plenty of credits left -> ok", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { success: true, data: { remainingCredits: 4000, planCredits: 5000 } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/team/credit-usage");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 4000);
  assertEquals(report.quota?.[0].limit, 5000);
});

test("quota: at or above 90% consumed -> degraded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { success: true, data: { remainingCredits: 400, planCredits: 5000 } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

test("quota: zero credits remaining -> down, not merely degraded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { success: true, data: { remainingCredits: 0, planCredits: 5000 } },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("402"), true);
});

test("quota: a non-2xx response reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { success: false, error: "Unauthorized" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("quota: is signed and connection-scoped — every user has their own credits", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
