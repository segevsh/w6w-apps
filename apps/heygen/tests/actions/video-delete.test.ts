import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import videoDelete from "../../actions/video-delete.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("video-delete: sends DELETE to the video's own path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "v1", deleted: true }) }]);
  const out = await videoDelete.execute({ videoId: "v1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/videos/v1");
  assertEquals(out, { id: "v1", deleted: true });
});

test("video-delete: is marked idempotent — retrying a delete is safe", () => {
  assertEquals(videoDelete.idempotent, true);
});
