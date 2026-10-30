import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import toolAddCoverArt from "../../actions/tool-add-cover-art.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("tool-add-cover-art: POST /tools/add_cover_art", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "add_cover_art" } }]);
  await toolAddCoverArt.execute(
    { videoUrl: "https://x/in.mp4", imageUrl: "https://x/cover.png" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/add_cover_art");
  assertEquals(JSON.parse(calls[0].body!), {
    video_url: "https://x/in.mp4",
    image_url: "https://x/cover.png",
  });
});

test("tool-add-cover-art: requires videoUrl and imageUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() =>
    toolAddCoverArt.execute({ videoUrl: "https://x/in.mp4", imageUrl: "" }, ctx)
  );
});
