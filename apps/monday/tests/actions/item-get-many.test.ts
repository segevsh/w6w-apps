import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-get-many.ts";

test("item-get-many: queries items_page under the board, default limit 50", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { boards: [] } } }]);
  await action.execute({ boardId: "b1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("items_page(limit: $limit)"), true);
  assertEquals(sent.variables, { boardId: ["b1"], limit: 50 });
});

test("item-get-many: narrows to a group when given one", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { boards: [] } } }]);
  await action.execute({ boardId: "b1", groupId: "topics", limit: 100 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    boardId: ["b1"],
    groupId: ["topics"],
    limit: 100,
  });
});
