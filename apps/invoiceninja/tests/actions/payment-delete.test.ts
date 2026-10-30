import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/payment-delete.ts";

test("payment-delete: DELETEs /payments/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ status: 204 }]);
  const out = await action.execute({ paymentId: "p1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/payments/p1");
  assertEquals(out, {});
});
