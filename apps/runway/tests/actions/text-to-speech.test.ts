import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/text-to-speech.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("text-to-speech: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "11111111-1111-4111-8111-111111111111" } }]);
  const out = await run(action, {
    "model": "eleven_v4",
    "promptText": "Hello [laughs]",
    "presetVoiceId": "Maya",
    "outputFormat": "mp3",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/text_to_speech");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "promptText": "Hello [laughs]",
    "voice": { "type": "runway-preset", "presetId": "Maya" },
    "outputFormat": "mp3",
    "model": "eleven_v4",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "taskId": "11111111-1111-4111-8111-111111111111",
  });
});

Deno.test("text-to-speech: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () =>
      run(action, {
        "model": "eleven_v4",
        "promptText": "Hello [laughs]",
        "presetVoiceId": "Maya",
        "outputFormat": "mp3",
      }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});

Deno.test("text-to-speech: a reference audio becomes a reference-audio voice", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t" } }]);
  await run(action, {
    model: "seed_audio",
    promptText: "hi",
    referenceAudioUri: "https://x.test/v.mp3",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).voice, {
    type: "reference-audio",
    audioUri: "https://x.test/v.mp3",
  });
});
