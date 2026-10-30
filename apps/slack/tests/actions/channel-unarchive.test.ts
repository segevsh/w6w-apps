import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-unarchive.ts";

test("channel-unarchive: POSTs /conversations.unarchive with { channel }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channelId: "C1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/conversations.unarchive");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1" });
});
