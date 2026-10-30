import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import toolCreateGifPreview from "../../actions/tool-create-gif-preview.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("tool-create-gif-preview: POST /tools/create_gif_preview", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { uid: "j1", tool: "create_gif_preview" },
  }]);
  await toolCreateGifPreview.execute({ videoUrl: "https://x/in.mp4", fps: 8, duration: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/tools/create_gif_preview");
  assertEquals(JSON.parse(calls[0].body!), {
    video_url: "https://x/in.mp4",
    fps: 8,
    duration: 3,
  });
});

test("tool-create-gif-preview: requires videoUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolCreateGifPreview.execute({ videoUrl: "" }, ctx));
});
