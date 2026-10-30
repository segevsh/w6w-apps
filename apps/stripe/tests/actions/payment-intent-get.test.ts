import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-intent-get.ts";

test("payment-intent-get: GETs /payment_intents/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pi_1" } }]);
  await action.execute({ paymentIntentId: "pi_1" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/payment_intents/pi_1");
});
