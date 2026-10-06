import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/video-to-hdr.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("video-to-hdr: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "ruby",
    "videoUri": "https://x.test/a.mp4",
    "outputFormat": "hdr10",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/video_to_hdr");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "videoUri": "https://x.test/a.mp4",
    "outputFormat": "hdr10",
    "model": "ruby",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("video-to-hdr: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(
        action,
        { "model": "ruby", "videoUri": "https://x.test/a.mp4", "outputFormat": "hdr10" },
        bad.ctx,
      ),
    Error,
    "No API key was provided.",
  );
});
