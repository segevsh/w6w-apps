import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import groupMembersRemove from "../../actions/group-members-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("group-members-remove: DELETEs with a parsed userIds list", async () => {
  const { ctx, calls } = mockCtx([{ body: { group: {} } }]);
  await groupMembersRemove.execute({ groupId: "group_abc", userIds: ["user_def456"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/groups/group_abc/members");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { userIds: ["user_def456"] });
});

test("group-members-remove: rejects an empty userIds list", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () =>
    await groupMembersRemove.execute({ groupId: "group_abc", userIds: [] }, ctx)
  );
});
