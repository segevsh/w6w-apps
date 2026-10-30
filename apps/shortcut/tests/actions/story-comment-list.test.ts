import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import storyCommentList from "../../actions/story-comment-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("story-comment-list: calls GET /stories/{id}/comments", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, text: "hi" }] }]);
  await storyCommentList.execute({ storyId: 123 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/stories/123/comments");
});
