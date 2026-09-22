import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-customer-invoice.ts";

Deno.test("get-customer-invoice: GETs /customer_invoices/{id}", async () => {
  const invoice = { id: 10, invoice_number: "F-2026-001", status: "paid" };
  const { ctx, calls } = mockCtx([{ body: invoice }]);
  const res = await action.execute({ id: "10" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/customer_invoices/10");
  assertEquals(calls[0].body, null);
  assertEquals(res, invoice);
});
