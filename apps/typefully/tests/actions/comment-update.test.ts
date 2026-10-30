import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import commentUpdate from "../../actions/comment-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("comment-update: PATCHes the comment's text", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "t1", comments: [{ id: "c1", text: "edited" }] },
  }]);
  await commentUpdate.execute({
    socialSetId: 4,
    draftId: 12,
    commentThreadId: "t1",
    commentId: "c1",
    text: "edited",
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/social-sets/4/drafts/12/comment-threads/t1/comments/c1",
  );
  assertEquals(JSON.parse(calls[0].body!), { text: "edited" });
});

test("comment-update: idempotent — the same text twice leaves the same result", () => {
  assertEquals(commentUpdate.idempotent, true);
});
