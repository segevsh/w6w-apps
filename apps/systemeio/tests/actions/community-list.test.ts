import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import communityList from "../../actions/community-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

test("community-list: hits /api/community/communities", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Members" }]) }]);
  await communityList.execute({ query: "Members" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/community/communities");
  assertEquals(queryOf(calls[0].url), { query: "Members" });
});
