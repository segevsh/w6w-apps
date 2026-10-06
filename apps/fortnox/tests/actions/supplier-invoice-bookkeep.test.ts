import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/supplier-invoice-bookkeep.ts";

Deno.test("supplier-invoice-bookkeep: PUT /3/supplierinvoices/{givenNumber}/bookkeep", async () => {
  const reply = { "SupplierInvoice": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "givenNumber": "givenNumber-v" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/3/supplierinvoices/givenNumber-v/bookkeep");
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
