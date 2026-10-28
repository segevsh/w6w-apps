import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/message-post-bot.ts";

Deno.test("message-post-bot: sends userids as a comma string", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "user_ids": ["55743307"], "message_details": {} },
  }]);
  const out = await action.execute(
    {
      "botUniqueName": "zylkerbot",
      "text": "Hi",
      "userIds": ["55743307", "55622727"],
      "syncMessage": true,
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/bots/zylkerbot/message");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "text": "Hi",
    "userids": "55743307,55622727",
    "sync_message": true,
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "success": true,
    "response": { "user_ids": ["55743307"], "message_details": {} },
  });
});

Deno.test("message-post-bot: idempotent is declared as false", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
