import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import paymentCreate from "../../actions/payment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("payment-create: posts a single payment object", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "pa_eXampl3", amount: 50, currency: "USD" }] }]);
  const out = await paymentCreate.execute(
    { affiliateId: "janejameson", amount: 50, currency: "USD" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/payments/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    affiliate_id: "janejameson",
    amount: 50,
    currency: "USD",
  });
  assertEquals(out, [{ id: "pa_eXampl3", amount: 50, currency: "USD" }]);
});
