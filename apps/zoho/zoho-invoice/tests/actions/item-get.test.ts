import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

test("item-get: GETs /items/{id} and unwraps the singular key", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", item: { item_id: "9" } } },
  ]);
  const out = await action.execute({ recordId: "9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/items/9");
  assertEquals(out, { item_id: "9" });
});
