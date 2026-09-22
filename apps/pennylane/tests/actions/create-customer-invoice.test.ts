import { assert, assertEquals } from "@std/assert";
import { mockCtx, rejection } from "../_helpers.ts";
import action from "../../actions/create-customer-invoice.ts";

const LINES = [{
  label: "Consulting",
  raw_currency_unit_price: "100.00",
  unit: "hour",
  vat_rate: "FR_200",
  quantity: "1",
}];

Deno.test("create-customer-invoice: a default draft sends draft:true with the four required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 10 } }]);
  await action.execute({
    date: "2026-09-22",
    deadline: "2026-10-22",
    customer_id: 42,
    invoice_lines: LINES,
    draft: true,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/customer_invoices");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, {
    date: "2026-09-22",
    deadline: "2026-10-22",
    customer_id: 42,
    invoice_lines: LINES,
    draft: true,
  });
});

Deno.test("create-customer-invoice: draft omitted or false produces the Finalized shape (no `draft` key at all)", async () => {
  const omitted = mockCtx([{ body: { id: 10 } }]);
  await action.execute({
    date: "2026-09-22",
    deadline: "2026-10-22",
    customer_id: 42,
    invoice_lines: LINES,
  }, omitted.ctx);
  const withoutKey = JSON.parse(omitted.calls[0].body!);
  assertEquals("draft" in withoutKey, false);

  const explicitFalse = mockCtx([{ body: { id: 10 } }]);
  await action.execute({
    date: "2026-09-22",
    deadline: "2026-10-22",
    customer_id: 42,
    invoice_lines: LINES,
    draft: false,
  }, explicitFalse.ctx);
  const finalised = JSON.parse(explicitFalse.calls[0].body!);
  assertEquals("draft" in finalised, false, "`draft: false` is not a documented body value");
});

Deno.test("create-customer-invoice: forwards the optional PDF, currency and reference fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 10 } }]);
  await action.execute({
    date: "2026-09-22",
    deadline: "2026-10-22",
    customer_id: 42,
    invoice_lines: LINES,
    draft: true,
    customer_invoice_template_id: 3,
    pdf_invoice_free_text: "Contact: John",
    pdf_invoice_subject: "Invoice title",
    pdf_description: "Invoice description",
    currency: "USD",
    label: "F-2026-001",
    external_reference: "inv-1",
    purchase_order_reference: "PO-1",
    sales_order_reference: "SO-1",
  }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), [
    "currency",
    "customer_id",
    "customer_invoice_template_id",
    "date",
    "deadline",
    "draft",
    "external_reference",
    "invoice_lines",
    "label",
    "pdf_description",
    "pdf_invoice_free_text",
    "pdf_invoice_subject",
    "purchase_order_reference",
    "sales_order_reference",
  ]);
  assertEquals(sent.currency, "USD");
});

Deno.test("create-customer-invoice: a 422 business-rule refusal surfaces `details`", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      error: "unprocessable_entity",
      message: "Validation failed",
      details: { invoice_lines: ["quantity is required"] },
    },
  }]);
  const err = await rejection(action.execute({
    date: "2026-09-22",
    deadline: "2026-10-22",
    customer_id: 42,
    invoice_lines: LINES,
  }, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("unprocessable_entity"), err.message);
  assert(err.message.includes("quantity is required"), err.message);
});
