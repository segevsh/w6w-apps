import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-create-invoice.ts";

Deno.test("order-create-invoice: PUT /3/orders/{documentNumber}/createinvoice", async () => {
  const reply = { "Order": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "documentNumber": "documentNumber-v" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/3/orders/documentNumber-v/createinvoice");
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
