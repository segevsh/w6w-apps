import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-credits.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-credits: maps total, the three plan buckets and the threshold", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        total_remaining_credits: 1500,
        plan_remaining_credits: { "pay-as-you-go": 1000, subscription: 400, bonus: 100 },
        low_credit_balance_min_threshold: 50,
      },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/account/credits");
  assertEquals(out, {
    totalRemaining: 1500,
    payAsYouGo: 1000,
    subscription: 400,
    bonus: 100,
    lowBalanceThreshold: 50,
  });
});

Deno.test("get-credits: a 401 token rejection throws", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { status: "failed", error: { code: 1000, message: "Invalid API Token" } },
  }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "Invalid API Token");
});
