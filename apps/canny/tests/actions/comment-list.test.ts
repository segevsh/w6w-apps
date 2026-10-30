import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import commentList from "../../actions/comment-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("comment-list: posts filters to /v2/comments/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], hasNextPage: false, cursor: null } }]);
  await commentList.execute({ postID: "p1", limit: 25 }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v2/comments/list");
  assertEquals(bodyOf(calls[0]), { postID: "p1", limit: 25 });
});
