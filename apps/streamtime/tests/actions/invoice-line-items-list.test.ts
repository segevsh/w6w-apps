import { assertEquals } from "@std/assert";
import invoiceLineItemsList from "../../actions/invoice-line-items-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-line-items-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 1, name: "Retainer", quantity: "1", taxName: "GST" }] },
  ]);
  const result = await invoiceLineItemsList.execute({ invoiceId: 3456 }, ctx) as {
    invoiceLineItems: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456/invoice_line_items");
  assertEquals(result.invoiceLineItems.length, 1);
});
