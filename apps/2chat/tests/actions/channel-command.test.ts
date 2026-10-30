import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import channelCommand from "../../actions/channel-command.ts";

test("channel-command: posts the command in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await channelCommand.execute!({ "channelUuid": "WPN1", "command": "disconnect" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/channel/WPN1/disconnect");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {});
});

test("channel-command: refuses an unknown command", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await channelCommand.execute!({ "channelUuid": "WPN1", "command": "delete" } as never, ctx);
  });
  assert.ok(err.message.includes("connect"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
