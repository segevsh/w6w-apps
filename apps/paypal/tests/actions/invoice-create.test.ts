import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    recipientEmail: "payer@example.com",
    itemName: "Consulting",
    quantity: "1",
    unitAmount: "500.00",
    currencyCode: "USD",
    ...overrides,
  };
}

Deno.test("invoice-create: happy path posts detail/recipient/item", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "INV-1", status: "DRAFT" } }]);
  const result = await action.execute!(baseInput(), ctx);

  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/invoicing/invoices");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.primary_recipients, [{ billing_info: { email_address: "payer@example.com" } }]);
  assertEquals(body.items, [{
    name: "Consulting",
    quantity: "1",
    unit_amount: { currency_code: "USD", value: "500.00" },
  }]);
  assertEquals(body.detail.currency_code, "USD");
  assertEquals(result, { id: "INV-1", status: "DRAFT" });
});

Deno.test("invoice-create: note and additionalFields populate detail", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    baseInput({
      note: "Thanks!",
      additionalFields: {
        invoiceNumber: "INV-0042",
        dueDate: "2026-08-15",
        termsAndConditions: "Net 30",
      },
    }),
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.detail.note, "Thanks!");
  assertEquals(body.detail.invoice_number, "INV-0042");
  assertEquals(body.detail.payment_term, { due_date: "2026-08-15" });
  assertEquals(body.detail.terms_and_conditions, "Net 30");
});

Deno.test("invoice-create: recipientEmail, itemName and unitAmount are required", async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["recipientEmail", { recipientEmail: "" }],
    ["itemName", { itemName: "" }],
    ["unitAmount", { unitAmount: "" }],
  ];
  for (const [field, patch] of cases) {
    const { ctx, calls } = mockCtx();
    await assertRejects(
      () => Promise.resolve(action.execute!(baseInput(patch), ctx)),
      Error,
      `\`${field}\``,
    );
    assertEquals(calls.length, 0);
  }
});
