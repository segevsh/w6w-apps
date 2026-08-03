import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/post-create.ts";

Deno.test("post-create: POSTs /posts.json with topic_id and no title", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { id: 5, post_number: 2 } }]);
  const out = await action.execute({ topicId: 42, raw: "A reply" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/posts.json`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { topic_id: 42, raw: "A reply" });
  // Presence of `topic_id` and absence of `title` is what makes this a reply
  // rather than a new topic on the same endpoint.
  assertEquals("title" in body, false);
  assertEquals(out, { id: 5, post_number: 2 });
});

Deno.test("post-create: threads under a post NUMBER, not a post id", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: 1, raw: "r", replyToPostNumber: 3 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).reply_to_post_number, 3);
});

Deno.test("post-create: backdating is optional and omitted when blank", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: 1, raw: "r", createdAt: "" }, ctx);
  assertEquals("created_at" in JSON.parse(calls[0].body!), false);
});

Deno.test("post-create: is not idempotent — a retry adds a second reply", () => {
  assertEquals(action.idempotent, false);
});
