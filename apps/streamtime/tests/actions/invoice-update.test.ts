import { assertEquals } from "@std/assert";
import invoiceUpdate from "../../actions/invoice-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-update: PUTs the writable fields, status included", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3456 } }]);
  await invoiceUpdate.execute({
    invoiceId: 3456,
    invoiceStatus: '{"id":2,"name":"Issued"}',
    dueDate: "2025-01-31",
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456");
  assertEquals(bodyOf(calls[0]), {
    invoiceStatus: { id: 2, name: "Issued" },
    dueDate: "2025-01-31",
  });
});

Deno.test("invoice-update: amounts and paidDate are read-only", () => {
  const keys = (invoiceUpdate.params ?? []).map((p) => p.key);
  for (
    const readonly of [
      "currencyCode",
      "exchangeRate",
      "invoiceCurrencyTotalAmountIncTax",
      "paidDate",
      "jobId",
    ]
  ) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
