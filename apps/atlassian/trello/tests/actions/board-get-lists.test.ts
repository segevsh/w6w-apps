import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-get-lists.ts";

test("board-get-lists: GETs /boards/{id}/lists with the filter", async () => {
  const lists = [{ id: "l1" }];
  const { ctx, calls } = mockCtx([{ body: lists }]);
  assertEquals(await action.execute({ id: "b1", filter: "all" }, ctx), lists);
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1/lists");
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "all");
});
