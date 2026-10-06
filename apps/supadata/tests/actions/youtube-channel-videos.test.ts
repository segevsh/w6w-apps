import { assertEquals, assertRejects } from "@std/assert";
import videos from "../../actions/youtube-channel-videos.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-channel-videos: GETs /youtube/channel/videos with type and limit", async () => {
  const body = { videoIds: ["a"], shortIds: [], liveIds: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await videos.execute({ id: "UC1", type: "short", limit: 10 }, ctx), body);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/youtube/channel/videos");
  assertEquals(Object.fromEntries(url.searchParams), { id: "UC1", type: "short", limit: "10" });
});

Deno.test("youtube-channel-videos: only id is sent by default; a blank id makes no call", async () => {
  const { ctx, calls } = mockCtx([{ body: { videoIds: [], shortIds: [], liveIds: [] } }]);
  await videos.execute({ id: "UC1" }, ctx);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/youtube/channel/videos?id=UC1");
  const none = mockCtx();
  await assertRejects(async () => await videos.execute({ id: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});
