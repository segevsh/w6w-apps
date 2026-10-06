import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-verify-credits.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-verify-credits: maps available credits and the credits object with the daily limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        available_credits: 900,
        credits: {
          available: 900,
          subs: "0",
          available_daily_verify_limit: "10000",
          reset_daily_verify_limit_date: "d",
          total: 1000,
        },
        low_credit_balance_min_threshold: 10,
      },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_verify/getcredits");
  assertEquals(out.availableCredits, 900);
  assertEquals((out.credits as Record<string, string>).available_daily_verify_limit, "10000");
  assertEquals(out.lowBalanceThreshold, 10);
});

Deno.test("get-verify-credits: a 401 throws", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { status: "failed", error: { code: 1000, message: "Invalid API Token" } },
  }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "401");
});
