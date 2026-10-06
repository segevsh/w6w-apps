import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import channelStatusGet from "../../actions/channel-status-get.ts";

Deno.test("channel-status-get: reads the status", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "connection_status": "C", "events": [] },
  }]);
  const out = await channelStatusGet.execute!({ "channelUuid": "WPN1" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/channel/WPN1/status");
  assertEquals(calls[0].body, null);
  assertEquals((out as { connection_status: string }).connection_status, "C");
});
