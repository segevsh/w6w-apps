import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-supplier-invoice.ts";

Deno.test("get-supplier-invoice: GETs /supplier_invoices/{id}", async () => {
  const invoice = { id: 5, invoice_number: "A-001", payment_status: "paid" };
  const { ctx, calls } = mockCtx([{ body: invoice }]);
  const res = await action.execute({ id: "5" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/supplier_invoices/5");
  assertEquals(res, invoice);
});
