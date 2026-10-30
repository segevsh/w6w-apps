import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/post-get.ts";

test("post-get: GETs /posts/{id}.json and returns the post unenveloped", async () => {
  // This route returns the post directly; the PUT on the same path wraps it in
  // `{ post: … }`. The asymmetry is Discourse's.
  const { ctx, calls } = mockDiscourseCtx([{ body: { id: 5, raw: "hi", topic_id: 1 } }]);
  const out = await action.execute({ postId: 5 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/posts/5.json`);
  assertEquals(out, { id: 5, raw: "hi", topic_id: 1 });
});
