import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-member.ts";

test("channel-member: GETs /conversations.members with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, members: [] } }]);
  await action.execute!({ channelId: "C1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/conversations.members");
  assertEquals(url.searchParams.get("channel"), "C1");
  assertEquals(url.searchParams.get("limit"), "100");
});
