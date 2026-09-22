import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/inbox-send-message.ts";

Deno.test("inbox-send-message: POSTs the conversation, account and message", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({
    linkedInAccountId: 3,
    conversationId: "conv-1",
    message: "Thanks for connecting!",
  }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/inbox/SendMessage");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), {
    linkedInAccountId: 3,
    conversationId: "conv-1",
    message: "Thanks for connecting!",
  });
  assertEquals(result, { status: 200 });
});

Deno.test("inbox-send-message: an unset subject is not sent as an empty string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    linkedInAccountId: 3,
    conversationId: "conv-1",
    message: "hi",
  }, ctx);
  assertEquals("subject" in jsonBody(calls[0]), false);
});

Deno.test("inbox-send-message: a subject is sent when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    linkedInAccountId: 3,
    conversationId: "conv-1",
    message: "hi",
    subject: "Quick question",
  }, ctx);
  assertEquals(jsonBody(calls[0]).subject, "Quick question");
});
