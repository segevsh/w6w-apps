import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import channelList from "../../actions/channel-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("channel-list: GET /v2/channels", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ platform: "airbnb" }] } }]);
  const out = await channelList.execute({}, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v2/channels");
  assertEquals(out.data.length, 1);
});
