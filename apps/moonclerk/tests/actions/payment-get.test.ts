import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/payment-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("payment-get: GET /payments/:id and unwraps payment", async () => {
  const { ctx, calls } = mockCtx([{ body: { payment: { id: 1348394, status: "successful" } } }]);
  const out = await action.execute!({ paymentId: 1348394 }, ctx);
  assertEquals(calls[0].url, "https://api.moonclerk.com/payments/1348394");
  assertEquals(out, { payment: { id: 1348394, status: "successful" } });
});

Deno.test("payment-get: a body without a payment object is an error", async () => {
  const { ctx } = mockCtx([{ body: { payments: [] } }]);
  await assertRejects(
    async () => await action.execute!({ paymentId: 1 }, ctx),
    Error,
    'no "payment"',
  );
});
