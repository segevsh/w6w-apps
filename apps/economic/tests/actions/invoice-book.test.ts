import { assertEquals } from "@std/assert";
import action from "../../actions/invoice-book.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("invoice-book: POSTs the wrapped draft, with bookWithNumber and sendBy when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { bookedInvoiceNumber: 12 } }]);
  const out = await action.execute!(
    { draftInvoiceNumber: 4, bookWithNumber: 12, sendBy: "Email" },
    ctx,
  );
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/invoices/booked");
  assertEquals(JSON.parse(calls[0].body!), {
    draftInvoice: { draftInvoiceNumber: 4 },
    bookWithNumber: 12,
    sendBy: "Email",
  });
  assertEquals(out, { bookedInvoiceNumber: 12, invoice: { bookedInvoiceNumber: 12 } });
});

Deno.test("invoice-book: with only the draft number nothing else is sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { bookedInvoiceNumber: 1 } }]);
  await action.execute!({ draftInvoiceNumber: 4 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { draftInvoice: { draftInvoiceNumber: 4 } });
});
