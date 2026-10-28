import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/channel-get.ts";

Deno.test("channel-get: gets a channel (bare record)", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "channel_id": "O1", "name": "#a" },
  }]);
  const out = await action.execute({ "channelId": "O1" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channels/O1");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "channel": { "channel_id": "O1", "name": "#a" },
  });
});

Deno.test("channel-get: is a read action", () => {
  assertEquals(action.type, "read");
});
