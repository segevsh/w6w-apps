import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import voteList from "../../actions/vote-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("vote-list: posts filters to /v2/votes/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], hasNextPage: false, cursor: null } }]);
  await voteList.execute({ postID: "p1", limit: 50, cursor: "abc" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v2/votes/list");
  assertEquals(bodyOf(calls[0]), { postID: "p1", limit: 50, cursor: "abc" });
});
