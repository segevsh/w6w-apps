import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-intent-capture.ts";

Deno.test("payment-intent-capture: POSTs the capture route", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "succeeded" } }]);
  await action.execute({ paymentIntentId: "pi_1" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/payment_intents/pi_1/capture");
  assertEquals(calls[0].body, "");
});

Deno.test("payment-intent-capture: a partial capture sends amount_to_capture", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ paymentIntentId: "pi_1", amount: 400 }, ctx);
  assertEquals(calls[0].body, "amount_to_capture=400");
});
