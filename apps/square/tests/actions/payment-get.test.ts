import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payment-get.ts";

test("payment-get: GETs /v2/payments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { payment: { id: "p1" } } }]);
  await action.execute({ paymentId: "p1" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/payments/p1");
  assertEquals(action.type, "read");
});
