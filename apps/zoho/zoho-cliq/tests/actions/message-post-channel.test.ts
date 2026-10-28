import { assertEquals, assertRejects } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/message-post-channel.ts";

Deno.test("message-post-channel: posts by unique name as a bot (204)", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 204 }]);
  const out = await action.execute(
    {
      "channelUniqueName": "marketing",
      "text": "Hi",
      "botUniqueName": "bot1",
      "markAsRead": true,
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channelsbyname/marketing/message");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {
    "bot_unique_name": "bot1",
    "mark_as_read": "true",
  });
  assertEquals(JSON.parse(calls[0].body!), { "text": "Hi" });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "success": true, "response": null });
});

Deno.test("message-post-channel: posts by channel id as a reply with sync", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "message_id": "m10" } }]);
  const out = await action.execute(
    { "channelId": "O1", "text": "Hello!", "replyTo": "m9", "syncMessage": true } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channels/O1/message");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "text": "Hello!",
    "reply_to": "m9",
    "sync_message": true,
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "success": true,
    "messageId": "m10",
    "response": { "message_id": "m10" },
  });
});

Deno.test("message-post-channel: needs a channel id or unique name", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ "text": "x" } as never, ctx)),
    Error,
    "channel id or a channel unique name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-post-channel: idempotent is declared as false", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
