import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-reply.ts";

Deno.test("conversation-reply: admin comment POSTs to /reply with admin_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42" } }]);
  await action.execute!(
    { conversationId: "42", type: "admin", messageType: "comment", body: "hi", adminId: "99" },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/conversations/42/reply");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    message_type: "comment",
    type: "admin",
    body: "hi",
    admin_id: "99",
  });
});

Deno.test("conversation-reply: user reply drops admin_id and keeps the contact identifier", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42" } }]);
  await action.execute!(
    { conversationId: "42", type: "user", body: "thanks", email: "a@b.com", adminId: "99" },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    message_type: "comment",
    type: "user",
    body: "thanks",
    email: "a@b.com",
  });
});
