import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

test("invoice-update: PUTs the fields to /invoices/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", invoice: { invoice_id: "77" } } },
  ]);
  await action.execute({ recordId: "77", fields: { reference_number: "PO-1" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/invoices/77");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { reference_number: "PO-1" });
});
