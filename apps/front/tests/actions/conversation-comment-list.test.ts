import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-comment-list.ts";

Deno.test("conversation-comment-list: reads the comments collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [{ id: "com_1" }] } }]);
  assertEquals(await action.execute!({ conversationId: "cnv_1" }, ctx), [{ id: "com_1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/comments");
});

Deno.test("conversation-comment-list: a missing conversation id is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "conversationId");
});
