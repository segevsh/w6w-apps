import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/playback-id-delete.ts";

test("playback-id-delete: revokes one id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ assetId: "a1", playbackId: "pb1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/assets/a1/playback-ids/pb1");
});

test("playback-id-delete: both ids are required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ assetId: "a1" }, ctx),
    Error,
    "playbackId",
  );
});

/** The video survives — that is the whole point. */
test("playback-id-delete: says the asset is untouched", () => {
  assert(/without touching the/.test(action.description!), action.description);
});
