import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/item-update.ts";

test("item-update: PUTs /items/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", item: { item_id: "9" } } },
  ]);
  await action.execute({ recordId: "9", fields: { rate: 135 } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/items/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { rate: 135 });
});
