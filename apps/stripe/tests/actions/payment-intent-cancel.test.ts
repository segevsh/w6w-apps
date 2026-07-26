import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-intent-cancel.ts";

Deno.test("payment-intent-cancel: POSTs the cancel route with the reason", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "canceled" } }]);
  await action.execute({ paymentIntentId: "pi_1", cancellationReason: "duplicate" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/payment_intents/pi_1/cancel");
  assertEquals(calls[0].body, "cancellation_reason=duplicate");
});
