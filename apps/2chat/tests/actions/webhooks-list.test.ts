import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import webhooksList from "../../actions/webhooks-list.ts";

test("webhooks-list: lists all webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "webhooks": [] } }]);
  await webhooksList.execute!({} as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/webhooks");
  assert.deepStrictEqual(calls[0].body, null);
});

test("webhooks-list: lists one channel's webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "webhooks": [] } }]);
  await webhooksList.execute!({ "channelUuid": "WPN1" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/webhooks/channel/WPN1");
  assert.deepStrictEqual(calls[0].body, null);
});
