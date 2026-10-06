import { assertEquals, assertRejects } from "@std/assert";
import videos from "../../actions/youtube-playlist-videos.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-playlist-videos: GETs /youtube/playlist/videos with id and limit", async () => {
  const body = { videoIds: ["a", "b"], shortIds: [], liveIds: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await videos.execute({ id: "PL1", limit: 2 }, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/playlist/videos?id=PL1&limit=2");
});

Deno.test("youtube-playlist-videos: limit is omitted when unset; a blank id makes no call", async () => {
  const { ctx, calls } = mockCtx([{ body: { videoIds: [], shortIds: [], liveIds: [] } }]);
  await videos.execute({ id: "PL1" }, ctx);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/playlist/videos?id=PL1");
  const none = mockCtx();
  await assertRejects(async () => await videos.execute({ id: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
