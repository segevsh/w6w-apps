import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-leave.ts";

test("channel-leave: POSTs /conversations.leave with { channel }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channelId: "C1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.leave");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1" });
});
