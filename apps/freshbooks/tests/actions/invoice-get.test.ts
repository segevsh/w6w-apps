import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

test("invoice-get: GETs /invoices/invoices/{invoiceId}", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { invoice: {} } } } }]);
  await action.execute({ invoiceId: "324" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/accounting/account/acc1/invoices/invoices/324",
  );
});
