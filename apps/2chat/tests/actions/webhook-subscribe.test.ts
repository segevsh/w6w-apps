import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import webhookSubscribe from "../../actions/webhook-subscribe.ts";

Deno.test("webhook-subscribe: subscribes with the event in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "data": { "uuid": "WHK1" } } }]);
  await webhookSubscribe.execute!(
    {
      "eventName": "whatsapp.message.received",
      "hookUrl": "https://h.example/x",
      "onNumber": "+595981048477",
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/webhooks/subscribe/whatsapp.message.received",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "hook_url": "https://h.example/x",
    "on_number": "+595981048477",
  });
});

Deno.test("webhook-subscribe: passes the conversation window and group filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "data": {} } }]);
  await webhookSubscribe.execute!(
    {
      "eventName": "whatsapp.conversation.new",
      "hookUrl": "https://h",
      "onNumber": "+595981048477",
      "timePeriod": "day",
      "toGroupUuid": "WAG1",
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/webhooks/subscribe/whatsapp.conversation.new",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "hook_url": "https://h",
    "on_number": "+595981048477",
    "time_period": "day",
    "to_group_uuid": "WAG1",
  });
});
