import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-delete.ts";

test("board-delete: DELETEs /boards/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { _value: null } }]);
  await action.execute({ id: "b1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1");
});
