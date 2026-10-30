import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get.ts";

test("list-get: GETs /lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  await action.execute({ id: "l1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/1/lists/l1");
});
