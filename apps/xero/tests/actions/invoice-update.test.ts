import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

Deno.test("invoice-update: POSTs /Invoices/{id} with the fields envelope", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Invoices: [{ InvoiceID: "i1" }] } }]);
  await action.execute({ invoiceId: "i1", fields: { Status: "AUTHORISED" } }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Invoices/i1");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { Invoices: [{ Status: "AUTHORISED" }] });
});
