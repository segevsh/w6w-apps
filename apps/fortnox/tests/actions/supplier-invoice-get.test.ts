import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/supplier-invoice-get.ts";

Deno.test("supplier-invoice-get: GET /3/supplierinvoices/{givenNumber} with its query", async () => {
  const reply = { "SupplierInvoice": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "givenNumber": "givenNumber-v" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/supplierinvoices/givenNumber-v");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
