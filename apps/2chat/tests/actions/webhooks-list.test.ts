import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import webhooksList from "../../actions/webhooks-list.ts";

Deno.test("webhooks-list: lists all webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "webhooks": [] } }]);
  await webhooksList.execute!({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/webhooks");
  assertEquals(calls[0].body, null);
});

Deno.test("webhooks-list: lists one channel's webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "webhooks": [] } }]);
  await webhooksList.execute!({ "channelUuid": "WPN1" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/webhooks/channel/WPN1");
  assertEquals(calls[0].body, null);
});
