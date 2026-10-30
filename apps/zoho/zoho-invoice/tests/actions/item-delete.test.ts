import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/item-delete.ts";

test("item-delete: DELETEs /items/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([{
    body: { code: 0, message: "The item has been deleted." },
  }]);
  const out = await action.execute({ recordId: "9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/items/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { code: 0, message: "The item has been deleted." });
});
