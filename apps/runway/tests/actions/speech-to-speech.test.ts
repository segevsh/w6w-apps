import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/speech-to-speech.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("speech-to-speech: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "eleven_multilingual_sts_v2",
    "mediaType": "video",
    "mediaUri": "https://x.test/a.mp4",
    "presetVoiceId": "Maya",
    "removeBackgroundNoise": true,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/speech_to_speech");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "media": { "type": "video", "uri": "https://x.test/a.mp4" },
    "voice": { "type": "runway-preset", "presetId": "Maya" },
    "removeBackgroundNoise": true,
    "model": "eleven_multilingual_sts_v2",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("speech-to-speech: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "eleven_multilingual_sts_v2",
        "mediaType": "video",
        "mediaUri": "https://x.test/a.mp4",
        "presetVoiceId": "Maya",
        "removeBackgroundNoise": true,
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
