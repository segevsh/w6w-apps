import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: GETs /invoices/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "in_1" } }]);
  await action.execute({ invoiceId: "in_1" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/invoices/in_1");
});
