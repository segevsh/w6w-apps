import { assertEquals, assertRejects } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("message-send: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await messageSend.execute({
    "accountId": "accountId-v",
    "messageText": "messageText-v",
    "profileUrl": "profileUrl-v",
    "inmail": true,
    "subject": "subject-v",
    "recipientUrn": "recipientUrn-v",
    "phoneNumber": "phoneNumber-v",
    "to": "to-v",
    "html": "html-v",
    "replyTo": "replyTo-v",
    "threadRef": "threadRef-v",
    "cc": "a; b",
    "bcc": "a; b",
    "mediaLink": "mediaLink-v",
    "mediaLinks": "a; b",
    "voiceMessage": true,
    "quotedMessageId": "quotedMessageId-v",
  } as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "send",
    "params": {
      "message_text": "messageText-v",
      "profile_url": "profileUrl-v",
      "inmail": true,
      "subject": "subject-v",
      "recipient_urn": "recipientUrn-v",
      "phone_number": "phoneNumber-v",
      "to": "to-v",
      "html": "html-v",
      "reply_to": "replyTo-v",
      "thread_ref": "threadRef-v",
      "cc": ["a", "b"],
      "bcc": ["a", "b"],
      "media_link": "mediaLink-v",
      "media_links": ["a", "b"],
      "voice_message": true,
      "quoted_message_id": "quotedMessageId-v",
    },
  });
});

Deno.test("message-send: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await messageSend.execute(
    { "accountId": "accountId-v", "messageText": "messageText-v" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "send",
    "params": { "message_text": "messageText-v" },
  });
});

Deno.test("message-send: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await messageSend.execute(
        { "accountId": "accountId-v", "messageText": "messageText-v" } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
