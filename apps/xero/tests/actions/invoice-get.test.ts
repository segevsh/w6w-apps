import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /Invoices/{id}", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Invoices: [{ InvoiceID: "i1" }] } }]);
  await action.execute({ invoiceId: "i1" }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Invoices/i1");
});
