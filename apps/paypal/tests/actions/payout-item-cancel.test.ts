import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payout-item-cancel.ts";

Deno.test("payout-item-cancel: posts to /cancel", async () => {
  const { ctx, calls } = mockCtx([{
    body: { payout_item_id: "ITEM-1", transaction_status: "UNCLAIMED" },
  }]);
  const result = await action.execute!({ payoutItemId: "ITEM-1" }, ctx);
  assertEquals(calls[0].url, "https://api-m.paypal.com/v1/payments/payouts-item/ITEM-1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(result, { payout_item_id: "ITEM-1", transaction_status: "UNCLAIMED" });
});

Deno.test("payout-item-cancel: payoutItemId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ payoutItemId: "" }, ctx)),
    Error,
    "`payoutItemId`",
  );
  assertEquals(calls.length, 0);
});
