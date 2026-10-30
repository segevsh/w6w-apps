import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/estimate-list.ts";

test("estimate-list: GETs /estimates with a customer filter", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", estimates: [{ estimate_id: "1" }] } },
  ]);
  const out = await action.execute({ customerId: "555" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/estimates");
  assertEquals(url.searchParams.get("customer_id"), "555");
  assertEquals(out.data, [{ estimate_id: "1" }]);
});
