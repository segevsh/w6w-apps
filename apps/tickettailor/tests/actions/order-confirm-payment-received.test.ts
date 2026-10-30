import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import orderConfirmPaymentReceived from "../../actions/order-confirm-payment-received.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("order-confirm-payment-received: POSTs the optional transaction id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "or_1", object: "order", payment_received: "true" } },
  ]);
  const result = await orderConfirmPaymentReceived.execute(
    { orderId: "or_1", transactionId: "OFF_PLATFORM_12345" },
    ctx,
  ) as { payment_received: string };
  assertEquals(pathOf(calls[0].url), "/v1/orders/or_1/confirm-payment-received");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("transaction_id"), "OFF_PLATFORM_12345");
  assertEquals(result.payment_received, "true");
});
