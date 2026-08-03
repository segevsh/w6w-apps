import { assertEquals } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/post-update.ts";

/**
 * The behaviour this action exists to get right. `POST /posts` requires a body;
 * `PUT /posts/{id}` requires nothing. Running the body resolver unconditionally
 * would reject every body-less edit with "a body is required" — which is
 * exactly wrong for a partial update.
 */
Deno.test("post-update: a settings-only edit sends NO body field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: 4, isPinned: true }, ctx);
  assertEquals(calls[0].url, `${API}/posts/4`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { is_pinned: true });
});

Deno.test("post-update: a supplied text body is wrapped into a TipTap document", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: 4, text: "New" }, ctx);
  assertEquals(bodyOf(calls[0]).tiptap_body, {
    body: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "New" }] }],
    },
  });
});

Deno.test("post-update: a round-tripped document from post-get is passed through", async () => {
  const doc = { type: "doc", content: [{ type: "paragraph" }] };
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: 4, bodyJson: doc }, ctx);
  assertEquals(bodyOf(calls[0]).tiptap_body, { body: doc });
});

Deno.test("post-update: `false` on a comment flag is sent — it is a value, not an absence", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: 4, isCommentsEnabled: false, isLikingEnabled: false }, ctx);
  assertEquals(bodyOf(calls[0]), { is_comments_enabled: false, is_liking_enabled: false });
});

Deno.test("post-update: exposes no space param — v2 cannot move a post between spaces", () => {
  assertEquals(action.params!.some((p) => p.key === "spaceId"), false);
});

Deno.test("post-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
