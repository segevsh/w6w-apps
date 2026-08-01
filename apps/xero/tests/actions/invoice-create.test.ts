import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

const LINE_ITEMS = [{
  Description: "Consulting",
  Quantity: 1,
  UnitAmount: 100,
  AccountCode: "200",
}];

Deno.test("invoice-create: POSTs /Invoices with the Contact and LineItems envelope", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Invoices: [{ InvoiceID: "i1" }] } }]);
  await action.execute({ type: "ACCREC", contactId: "c1", lineItems: LINE_ITEMS }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Invoices");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    Invoices: [{ Type: "ACCREC", Contact: { ContactID: "c1" }, LineItems: LINE_ITEMS }],
  });
});

Deno.test("invoice-create: merges additionalFields and accepts lineItems as a JSON string", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: {} }]);
  await action.execute({
    type: "ACCPAY",
    contactId: "c1",
    lineItems: JSON.stringify(LINE_ITEMS),
    additionalFields: { Reference: "PO-42", DueDate: "2026-08-14" },
  }, ctx);
  const body = JSON.parse(calls[0].body!).Invoices[0];
  assertEquals(body.Type, "ACCPAY");
  assertEquals(body.LineItems, LINE_ITEMS);
  assertEquals(body.Reference, "PO-42");
  assertEquals(body.DueDate, "2026-08-14");
});
