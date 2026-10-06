import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/image-to-video.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("image-to-video: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "gen4_turbo",
    "promptImage": "https://x.test/a.png",
    "ratio": "1280:720",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/image_to_video");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "promptImage": "https://x.test/a.png",
    "ratio": "1280:720",
    "model": "gen4_turbo",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("image-to-video: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "gen4_turbo",
        "promptImage": "https://x.test/a.png",
        "ratio": "1280:720",
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});

Deno.test("image-to-video: a JSON array promptImage is sent as an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t" } }]);
  const frames = [{ uri: "https://x.test/a.png", position: "first" }];
  await run(action, { model: "gen4.5", promptImage: JSON.stringify(frames) }, ctx);
  assertEquals(JSON.parse(calls[0].body!).promptImage, frames);
});
