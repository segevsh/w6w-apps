import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /invoice/{id}", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Invoice: { Id: "1" } } }]);
  await action.execute({ invoiceId: "1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/invoice/1?minorversion=75",
  );
});
