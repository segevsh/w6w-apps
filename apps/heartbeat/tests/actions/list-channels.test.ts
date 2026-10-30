import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listChannels from "../../actions/list-channels.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("list-channels: GET /channels, wrapped under `channels`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "ch1", name: "general", type: "POSTS" }] }]);
  const out = await listChannels.execute({}, ctx) as { channels: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/channels");
  assertEquals(out.channels.length, 1);
});
