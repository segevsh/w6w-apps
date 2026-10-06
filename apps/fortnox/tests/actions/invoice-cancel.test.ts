import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-cancel.ts";

Deno.test("invoice-cancel: PUT /3/invoices/{documentNumber}/cancel", async () => {
  const reply = { "Invoice": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "documentNumber": "documentNumber-v" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/3/invoices/documentNumber-v/cancel");
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
