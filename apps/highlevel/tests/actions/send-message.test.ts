import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

Deno.test("send-message: POSTs /conversations/messages with the message Version header", async () => {
  const { ctx, calls } = mockHighLevelCtx([
    { status: 201, body: { conversationId: "conv-1", messageId: "m1" } },
  ]);
  const out = await action.execute!({
    contactId: "c1",
    type: "SMS",
    message: "Hello there",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/conversations/messages");
  assertEquals(calls[0].headers["version"], "2021-04-15");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contactId, "c1");
  assertEquals(body.type, "SMS");
  assertEquals(body.message, "Hello there");
  assertEquals((out as { conversationId: string }).conversationId, "conv-1");
});

Deno.test("send-message: splits comma-separated CC/BCC addresses", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: {} }]);
  await action.execute!({
    contactId: "c1",
    type: "Email",
    subject: "Hi",
    emailCc: "a@b.com, c@d.com",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.emailCc, ["a@b.com", "c@d.com"]);
});
