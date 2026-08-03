import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: bounds the line-item and payment-record pages", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { invoice: { id: "i1" } } } }]);
  await action.execute({ invoiceId: "i1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.variables, { id: "i1" });
  assert(sent.query.includes("lineItems(first: 50)"));
  assert(sent.query.includes("paymentRecords(first: 25)"));
});
