import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/channel-get-many.ts";

test("channel-get-many: applies types+limit defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channels: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/conversations.list");
  assertEquals(url.searchParams.get("types"), "public_channel,private_channel");
  assertEquals(url.searchParams.get("limit"), "100");
});

test("channel-get-many: forwards excludeArchived and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, channels: [] } }]);
  await action.execute!({ excludeArchived: true, cursor: "abc", limit: 20 }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("exclude_archived"), "true");
  assertEquals(params.get("cursor"), "abc");
  assertEquals(params.get("limit"), "20");
});
