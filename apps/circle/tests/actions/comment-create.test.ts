import { assert, assertEquals } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-create.ts";

/**
 * The API's sharpest inconsistency, pinned. `POST /comments` types `body` as a
 * plain **string**, where `POST /posts` takes a nested TipTap document. Wrapping
 * this "for consistency" would send an object where a string is declared.
 */
Deno.test("comment-create: the body is sent as a plain string, NOT a TipTap document", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 3 } }]);
  await action.execute({ postId: 9, body: "Nice post" }, ctx);
  assertEquals(calls[0].url, `${API}/comments`);
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { post_id: 9, body: "Nice post" });
  assertEquals(typeof bodyOf(calls[0]).body, "string");
});

Deno.test("comment-create: a reply carries both the parent and the post", async () => {
  // `post_id` is required alongside `parent_comment_id` — the parent does not
  // imply the post, and omitting it 422s on the second call rather than the first.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: 9, body: "Agreed", parentCommentId: 3 }, ctx);
  assertEquals(bodyOf(calls[0]), { post_id: 9, body: "Agreed", parent_comment_id: 3 });
});

Deno.test("comment-create: skip_notifications is sent only when switched on", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ postId: 9, body: "x", skipNotifications: false }, ctx);
  assertEquals(bodyOf(calls[0]).skip_notifications, undefined);
  await action.execute({ postId: 9, body: "x", skipNotifications: true }, ctx);
  assertEquals(bodyOf(calls[1]).skip_notifications, true);
});

Deno.test("comment-create: exposes no author override — the schema has none", () => {
  assertEquals(action.params!.some((p) => /author|user|email/i.test(p.key)), false);
  assert(/token's owner/.test(action.description!));
});

Deno.test("comment-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
