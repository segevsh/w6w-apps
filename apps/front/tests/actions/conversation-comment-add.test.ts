import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-comment-add.ts";

Deno.test("conversation-comment-add: posts to the comments route, not messages", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "com_1" } }]);
  await action.execute!({ conversationId: "cnv_1", body: "internal note" }, ctx);
  // The distinction that matters: this must never reach /messages.
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/comments");
  assertEquals(JSON.parse(calls[0].body!), { body: "internal note" });
});

Deno.test("conversation-comment-add: author and pinning are optional extras", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "com_1" } }]);
  await action.execute!(
    { conversationId: "cnv_1", body: "n", authorId: "tea_1", isPinned: true },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.author_id, "tea_1");
  assertEquals(sent.is_pinned, true);
});

Deno.test("conversation-comment-add: says plainly that the customer never sees it", () => {
  assert(/customer never does|never sees/i.test(action.description!), action.description);
});

Deno.test("conversation-comment-add: an empty comment is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ conversationId: "cnv_1", body: "" }, ctx),
    Error,
    "body",
  );
  assertEquals(calls.length, 0);
});
