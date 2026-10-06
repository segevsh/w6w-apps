import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import channelCommand from "../../actions/channel-command.ts";

Deno.test("channel-command: posts the command in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await channelCommand.execute!({ "channelUuid": "WPN1", "command": "disconnect" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/channel/WPN1/disconnect");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("channel-command: refuses an unknown command", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await channelCommand.execute!({ "channelUuid": "WPN1", "command": "delete" } as never, ctx);
  }, Error);
  assert(err.message.includes("connect"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});
