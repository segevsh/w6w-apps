import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import paymentLinkCreate from "../../actions/payment-link-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("payment-link-create: posts description (amount optional) to /payment-links", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "pl_1" } }]);
  const out = await paymentLinkCreate.execute({ description: "Invoice #1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payment-links");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { description: "Invoice #1" });
  assertEquals(out, { id: "pl_1" });
});

test("payment-link-create: includes amount when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "pl_1" } }]);
  await paymentLinkCreate.execute(
    { description: "Invoice #1", amountValue: "25.00", amountCurrency: "EUR" },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    description: "Invoice #1",
    amount: { currency: "EUR", value: "25.00" },
  });
});
