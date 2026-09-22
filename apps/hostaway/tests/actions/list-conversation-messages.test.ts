import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-conversation-messages.ts";

Deno.test("list-conversation-messages: GETs /v1/conversations/{id}/messages", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 326, body: "hello guest" }], { count: 1 })]);
  const page = await action.execute(
    { conversationId: 1406, limit: 20, includeScheduledMessages: 1 },
    ctx,
  ) as { items: Array<{ body: string }> };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/conversations/1406/messages");
  assertEquals(url.searchParams.get("limit"), "20");
  assertEquals(url.searchParams.get("includeScheduledMessages"), "1");
  assertEquals(page.items[0].body, "hello guest");
});

Deno.test("list-conversation-messages: refuses a call without a conversation id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "conversationId");
});
