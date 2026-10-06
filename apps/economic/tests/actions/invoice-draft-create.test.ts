import { assertEquals } from "@std/assert";
import action from "../../actions/invoice-draft-create.ts";
import { mockCtx } from "../_helpers.ts";

const base = {
  customerNumber: 1,
  date: "2026-10-06",
  currency: "DKK",
  paymentTermsNumber: 1,
  layoutNumber: 21,
  recipientName: "Acme",
  recipientVatZoneNumber: 1,
};

Deno.test("invoice-draft-create: builds the documented draft body, lines as JSON text", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { draftInvoiceNumber: 9 } }]);
  const lines = [{ lineNumber: 1, description: "Work", quantity: 2, unitNetPrice: 100 }];
  const out = await action.execute!({
    ...base,
    recipientCity: "Aarhus",
    reference: "PO-1",
    heading: "Hello",
    lines: JSON.stringify(lines),
  }, ctx);
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/invoices/drafts");
  assertEquals(JSON.parse(calls[0].body!), {
    date: "2026-10-06",
    currency: "DKK",
    customer: { customerNumber: 1 },
    paymentTerms: { paymentTermsNumber: 1 },
    layout: { layoutNumber: 21 },
    recipient: { name: "Acme", city: "Aarhus", vatZone: { vatZoneNumber: 1 } },
    references: { other: "PO-1" },
    notes: { heading: "Hello" },
    lines,
  });
  assertEquals(out, { draftInvoiceNumber: 9, invoice: { draftInvoiceNumber: 9 } });
});

Deno.test("invoice-draft-create: minimal input sends no notes, references or lines", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { draftInvoiceNumber: 1 } }]);
  await action.execute!(base, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("notes" in body || "references" in body || "lines" in body, false);
});
