import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-delete.ts";

test("item-delete: sends delete_item with the item id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { delete_item: { id: "i1" } } } }]);
  await action.execute({ itemId: "i1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("delete_item(item_id: $itemId)"), true);
  assertEquals(sent.variables, { itemId: "i1" });
});
