import { assertEquals } from "@std/assert";
import action from "../../actions/message-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("message-list: GETs the messages of a conversation", async () => {
  const { ctx, calls } = mockCtx([{
    body: { message_list_count: 1, total_messages_count: 1, message_list: [{ message_id: 1 }] },
  }]);
  const out = await action.execute!(
    { conversationId: 12, limitCount: 50, displayArchived: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/conversations/12/messages");
  assertEquals(Object.fromEntries(url.searchParams), {
    limit_count: "50",
    display_archived: "true",
  });
  assertEquals(out, {
    messages: [{ message_id: 1 }],
    count: 1,
    total: 1,
    lastId: undefined,
  });
});

Deno.test("message-list: a 204 is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ conversationId: 1 }, ctx) as { messages: unknown[] };
  assertEquals(out.messages, []);
});
