import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-conversation.ts";

test("get-conversation: GETs /conversations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 123, subject: "Help" } }]);
  const out = await action.execute({ conversationId: 123 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/conversations/123");
  assertEquals(out, { id: 123, subject: "Help" });
});

test("get-conversation: embedThreads sets embed=threads", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ conversationId: 1, embedThreads: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("embed"), "threads");
});

test("get-conversation: embedThreads=false omits the param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ conversationId: 1, embedThreads: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("embed"), false);
});
