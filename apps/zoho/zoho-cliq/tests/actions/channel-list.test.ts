import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/channel-list.ts";

Deno.test("channel-list: lists channels, maps next_token", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "channels": [{ "channel_id": "O1" }], "next_token": "n" },
  }]);
  const out = await action.execute(
    { "level": "team", "joined": true, "limit": 10, "nextToken": "t" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channels");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "level": "team",
    "joined": "true",
    "limit": "10",
    "next_token": "t",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "channels": [{ "channel_id": "O1" }],
    "nextToken": "n",
  });
});

Deno.test("channel-list: is a read action", () => {
  assertEquals(action.type, "read");
});
