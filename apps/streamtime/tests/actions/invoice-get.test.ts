import { assertEquals } from "@std/assert";
import invoiceGet from "../../actions/invoice-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-get: reads GET /v2/invoices/{id} in the invoice currency", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 3456, currencyCode: "GBP", invoiceCurrencyBalance: 1200 } },
  ]);
  const result = await invoiceGet.execute({ invoiceId: 3456 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456");
  assertEquals(result.currencyCode, "GBP");
  assertEquals(result.invoiceCurrencyBalance, 1200);
});
