import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-get.ts";

Deno.test("order-get: GET /3/orders/{documentNumber} with its query", async () => {
  const reply = { "Order": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "documentNumber": "documentNumber-v" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/orders/documentNumber-v");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
