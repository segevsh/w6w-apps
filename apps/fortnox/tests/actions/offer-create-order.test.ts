import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/offer-create-order.ts";

test("offer-create-order: PUT /3/offers/{documentNumber}/createorder", async () => {
  const reply = { "Offer": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ "documentNumber": "documentNumber-v" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/3/offers/documentNumber-v/createorder");
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);
});
