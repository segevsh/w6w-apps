import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import storyCommentCreate from "../../actions/story-comment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("story-comment-create: posts text, and parentId for a reply", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 2 } }]);
  await storyCommentCreate.execute({ storyId: 123, text: "On it", parentId: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/stories/123/comments");
  assertEquals(JSON.parse(calls[0].body!), { text: "On it", parent_id: 1 });
});
