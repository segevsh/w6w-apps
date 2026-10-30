import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-delete.ts";

test("group-delete: sends delete_group with board and group ids", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { delete_group: { id: "g1", deleted: true } } },
  }]);
  await action.execute({ boardId: "b1", groupId: "topics" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("delete_group(board_id: $boardId, group_id: $groupId)"), true);
  assertEquals(sent.variables, { boardId: "b1", groupId: "topics" });
});

test("group-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
