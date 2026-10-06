import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/video-to-video.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("video-to-video: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "aleph2",
    "videoUri": "https://x.test/a.mp4",
    "promptText": "night",
    "mode": "edit",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/video_to_video");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "videoUri": "https://x.test/a.mp4",
    "promptText": "night",
    "mode": "edit",
    "model": "aleph2",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("video-to-video: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "aleph2",
        "videoUri": "https://x.test/a.mp4",
        "promptText": "night",
        "mode": "edit",
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});

Deno.test("video-to-video: needs videoUri or promptVideo", async () => {
  await assertRejects(
    () => run(action, { model: "aleph2" }, mockCtx().ctx),
    Error,
    "videoUri or promptVideo is required",
  );
});
