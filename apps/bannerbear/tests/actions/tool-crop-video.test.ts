import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import toolCropVideo from "../../actions/tool-crop-video.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("tool-crop-video: POST /tools/crop_video", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "crop_video" } }]);
  await toolCropVideo.execute(
    { videoUrl: "https://x/in.mp4", x: 0, y: 0, width: 500, height: 500 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/crop_video");
  assertEquals(JSON.parse(calls[0].body!), {
    video_url: "https://x/in.mp4",
    x: 0,
    y: 0,
    width: 500,
    height: 500,
  });
});

test("tool-crop-video: requires x, y, width, height", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolCropVideo.execute({ videoUrl: "https://x/in.mp4" } as never, ctx));
});
