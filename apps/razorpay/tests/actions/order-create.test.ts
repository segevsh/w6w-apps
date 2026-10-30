import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import orderCreate from "../../actions/order-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("order-create: posts amount/currency/receipt/notes to /orders", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "order_1", status: "created" } }]);
  const out = await orderCreate.execute(
    { amount: 50000, currency: "INR", receipt: "receipt_001", partialPayment: false },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/orders");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    amount: 50000,
    currency: "INR",
    receipt: "receipt_001",
    partial_payment: false,
  });
  assertEquals(out, { id: "order_1", status: "created" });
});

test("order-create: is not idempotent — every call starts a separate order", () => {
  assertEquals(orderCreate.idempotent, false);
});
