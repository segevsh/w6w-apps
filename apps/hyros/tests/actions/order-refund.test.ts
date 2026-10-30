import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, OK, pathOf, queryOf } from "../_helpers.ts";
import orderRefund from "../../actions/order-refund.ts";

test("order-refund: DELETE /orders/{id}?refundedAmount", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await orderRefund.execute({ orderId: "o/1", refundedAmount: "4.5" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/orders/o%2F1");
  assertEquals(queryOf(calls[0].url), { refundedAmount: "4.5" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { requestId: "req1", result: "OK" });
});

test("order-refund: whole-order refund sends no amount", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await orderRefund.execute({ orderId: "o1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
