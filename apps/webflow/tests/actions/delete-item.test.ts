import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-item.ts";

test("delete-item: DELETEs the item and normalizes 204 to { success: true }", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute!({ collectionId: "c1", itemId: "i1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1/items/i1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
