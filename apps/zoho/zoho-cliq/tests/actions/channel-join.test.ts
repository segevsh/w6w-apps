import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/channel-join.ts";

Deno.test("channel-join: joins and returns the channel", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "channel_id": "O1", "joined": true },
  }]);
  const out = await action.execute({ "channelId": "O1" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channels/O1/join");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "channel": { "channel_id": "O1", "joined": true },
  });
});

Deno.test("channel-join: idempotent is declared as true", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
