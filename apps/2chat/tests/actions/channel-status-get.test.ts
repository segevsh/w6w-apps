import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import channelStatusGet from "../../actions/channel-status-get.ts";

test("channel-status-get: reads the status", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "connection_status": "C", "events": [] },
  }]);
  const out = await channelStatusGet.execute!({ "channelUuid": "WPN1" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/channel/WPN1/status");
  assert.deepStrictEqual(calls[0].body, null);
  assert.deepStrictEqual((out as { connection_status: string }).connection_status, "C");
});
