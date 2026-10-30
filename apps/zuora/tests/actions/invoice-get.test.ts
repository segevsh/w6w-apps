import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/invoice-get.ts";

test("invoice-get: retrieves an invoice by key", async () => {
  const { ctx, calls } = mockCtx([one({ id: "inv1", amount: 100 })], { display });
  const result = await action.execute!({ invoiceKey: "INV00000001" }, ctx) as {
    invoice: { amount: number };
  };
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/invoices/INV00000001");
  assertEquals(result.invoice.amount, 100);
});
