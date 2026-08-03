import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action, { LIKE_POST_ACTION_TYPE_ID } from "../../actions/post-like.ts";

Deno.test("post-like: POSTs /post_actions.json with the like type id", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { id: 5 } }]);
  await action.execute({ postId: 5 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/post_actions.json`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { id: 5, post_action_type_id: 2 });
});

Deno.test("post-like: the type id is 2, and is a constant rather than a knob", () => {
  // Discourse's reference documents exactly one value for post_action_type_id
  // ("e.g., 2 for like"); the rest are flag types whose numbering is unpublished.
  // Exposing the integer would make every value but one an undocumented guess
  // that silently files a moderation flag instead of liking a post.
  assertEquals(LIKE_POST_ACTION_TYPE_ID, 2);
  assertEquals(action.params!.map((p) => p.key), ["postId"]);
});

Deno.test("post-like: is not idempotent — Discourse rejects a duplicate like", () => {
  assertEquals(action.idempotent, false);
});
