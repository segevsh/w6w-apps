import { assertEquals } from "@std/assert";
import invoicePaymentsList from "../../actions/invoice-payments-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-payments-list: reads the payments route", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 1, paymentDate: "2025-02-01", amountPaidIncTax: 500 }] },
  ]);
  const result = await invoicePaymentsList.execute({ invoiceId: 3456 }, ctx) as {
    invoicePayments: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456/invoice_payments");
  assertEquals(result.invoicePayments.length, 1);
});
