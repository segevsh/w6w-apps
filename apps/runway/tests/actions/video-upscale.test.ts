import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/video-upscale.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("video-upscale: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "enhance_frame_rate",
    "videoUri": "https://x.test/a.mp4",
    "targetFramerate": "23_98",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/video_upscale");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "videoUri": "https://x.test/a.mp4",
    "targetFramerate": "23_98",
    "model": "enhance_frame_rate",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("video-upscale: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "enhance_frame_rate",
        "videoUri": "https://x.test/a.mp4",
        "targetFramerate": "23_98",
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
