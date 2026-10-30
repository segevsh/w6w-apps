import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-list.ts";

test("get-list: GETs /contacts/v1/lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { listId: 42 } }]);
  await action.execute!({ listId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v1/lists/42");
});
