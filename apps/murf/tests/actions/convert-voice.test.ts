import { assert, assertEquals } from "@std/assert";
import action from "../../actions/convert-voice.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

const reply = {
  audio_file: "https://x/a.wav",
  audio_length_in_seconds: 3,
  remaining_character_count: 5,
};

Deno.test("convert-voice: sends multipart with file_url, snake_case fields and a boundary header", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await exec(action, {
    voiceId: "en-US-natalie",
    fileUrl: "https://x/in.mp3",
    locale: "en-US",
    sampleRate: "24000",
    retainAccent: false,
    rate: 0,
  }, ctx);
  const c = calls[0];
  assertEquals(c.url, "https://api.murf.ai/v1/voice-changer/convert");
  assertEquals(c.method, "POST");
  assert(c.headers["content-type"].startsWith("multipart/form-data; boundary="));
  for (
    const part of [
      'name="voice_id"\r\n\r\nen-US-natalie',
      'name="file_url"\r\n\r\nhttps://x/in.mp3',
      'name="multi_native_locale"\r\n\r\nen-US',
      'name="sample_rate"\r\n\r\n24000',
      'name="retain_accent"\r\n\r\nfalse',
      'name="rate"\r\n\r\n0',
    ]
  ) assert(c.body!.includes(part), part);
  assert(!c.body!.includes('name="style"'));
  assertEquals(out, reply);
});

Deno.test("convert-voice: requires voiceId and fileUrl", async () => {
  const { ctx, calls } = mockCtx();
  assert((await failure(action, { voiceId: "", fileUrl: "u" }, ctx)).includes("voiceId"));
  assert((await failure(action, { voiceId: "v", fileUrl: "" }, ctx)).includes("fileUrl"));
  assertEquals(calls.length, 0);
});
