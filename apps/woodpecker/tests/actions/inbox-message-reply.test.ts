import { assertEquals, assertRejects } from "@std/assert";
import inboxMessageReply from "../../actions/inbox-message-reply.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("inbox-message-reply: POSTs the reply with an html body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await inboxMessageReply.execute(
    {
      "message_id": "123",
      "html": "<p>Thanks</p>",
      "mailbox_id": "112233",
      "cc": "a@b.com",
      "quote_original_message": true,
    } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/inbox/messages/123/reply");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "cc": "a@b.com",
    "body": { "html": "<p>Thanks</p>" },
    "mailbox_id": 112233,
    "quote_original_message": true,
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.sent, true);
});

Deno.test("inbox-message-reply: an invalid recipient is surfaced", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: {
      "title": "Bad Request",
      "status": 400,
      "detail": "Recipient email if provided must be valid email address",
    },
  }]);
  await assertRejects(
    async () =>
      await inboxMessageReply.execute(
        { "message_id": "123", "html": "x", "to": "bad" } as never,
        ctx,
      ),
    Error,
    "Recipient email",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/v2/inbox/messages/123/reply");
  assertEquals(jsonBody(calls[0]), { "to": "bad", "body": { "html": "x" } });
});
