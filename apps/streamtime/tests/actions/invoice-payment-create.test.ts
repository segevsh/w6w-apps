import { assertEquals } from "@std/assert";
import invoicePaymentCreate from "../../actions/invoice-payment-create.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-payment-create: POSTs the payment against the invoice", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, amountPaidIncTax: 500 } }]);
  await invoicePaymentCreate.execute({
    invoiceId: 3456,
    amountPaidIncTax: 500,
    paymentDate: "2025-02-01",
    notes: "Bank transfer",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456/invoice_payments");
  assertEquals(bodyOf(calls[0]), {
    invoiceId: 3456,
    amountPaidIncTax: 500,
    paymentDate: "2025-02-01",
    notes: "Bank transfer",
  });
});

/** `paymentAccountId` is a query parameter, not a body field. */
Deno.test("invoice-payment-create: the payment account travels in the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await invoicePaymentCreate.execute({ invoiceId: 3456, paymentAccountId: "ACC-1" }, ctx);
  assertEquals(queryOf(calls[0].url), { paymentAccountId: "ACC-1" });
  assertEquals("paymentAccountId" in bodyOf(calls[0]), false);
});

/**
 * The three fields the schema marks read-only are exposed anyway — a payment
 * that cannot state an amount is not a payment — and each says so in its hint.
 */
Deno.test("invoice-payment-create: the read-only deviations are declared, and optional", () => {
  for (const key of ["amountPaidIncTax", "paymentDate", "notes"]) {
    const param = (invoicePaymentCreate.params ?? []).find((p) => p.key === key);
    assertEquals(param?.required, undefined, key);
    assertEquals(/Read-only in the schema/.test(param?.hint ?? ""), true, key);
  }
});
