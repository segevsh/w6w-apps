import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import avatarGroupList from "../../actions/avatar-group-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("avatar-group-list: lists groups and forwards filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "ag_1", name: "Anna" }]) }]);
  const out = await avatarGroupList.execute({ ownership: "private", limit: 10 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/avatars");
  assertEquals(queryOf(calls[0].url), { ownership: "private", limit: "10" });
  assertEquals(out, { items: [{ id: "ag_1", name: "Anna" }], hasMore: false, nextToken: null });
});
