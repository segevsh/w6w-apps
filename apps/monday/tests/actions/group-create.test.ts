import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-create.ts";

test("group-create: maps name to group_name and passes the board id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { create_group: { id: "g1", title: "Q3" } } } }]);
  await action.execute({ boardId: "b1", name: "Q3" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("create_group"), true);
  assertEquals(sent.variables, { boardId: "b1", groupName: "Q3" });
});
