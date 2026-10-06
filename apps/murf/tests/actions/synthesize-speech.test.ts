import { assert, assertEquals } from "@std/assert";
import action from "../../actions/synthesize-speech.ts";
import { bodyOf, exec, failure, mockCtx } from "../_helpers.ts";

const reply = {
  audioFile: "https://murf.ai/user-upload/a.wav",
  audioLengthInSeconds: 2.5,
  remainingCharacterCount: 9000,
  wordDurations: [],
};

Deno.test("synthesize-speech: POSTs /v1/speech/generate with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await exec(action, { text: "Hello", voiceId: "en-US-natalie" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.murf.ai/v1/speech/generate");
  assertEquals(bodyOf(calls[0]), { text: "Hello", voiceId: "en-US-natalie" });
  assertEquals(calls[0].headers["api-key"], undefined);
  assertEquals(out, reply);
});

Deno.test("synthesize-speech: maps options, sends sampleRate as a number and parses the dictionary", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  await exec(action, {
    text: "t",
    voiceId: "v",
    locale: "en-UK",
    style: "Calm",
    rate: -10,
    pitch: 0,
    variation: 3,
    format: "MP3",
    sampleRate: "24000",
    channelType: "STEREO",
    encodeAsBase64: true,
    wordDurationsAsOriginalText: false,
    audioDuration: 4,
    pronunciationDictionary: '{"live":{"type":"IPA","pronunciation":"laɪv"}}',
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    text: "t",
    voiceId: "v",
    locale: "en-UK",
    style: "Calm",
    rate: -10,
    pitch: 0,
    variation: 3,
    format: "MP3",
    sampleRate: 24000,
    channelType: "STEREO",
    encodeAsBase64: true,
    wordDurationsAsOriginalText: false,
    audioDuration: 4,
    pronunciationDictionary: { live: { type: "IPA", pronunciation: "laɪv" } },
  });
});

Deno.test("synthesize-speech: validates input before calling", async () => {
  const { ctx, calls } = mockCtx();
  assert((await failure(action, { text: " ", voiceId: "v" }, ctx)).includes("text"));
  assert((await failure(action, { text: "t", voiceId: "" }, ctx)).includes("voiceId"));
  assert(
    (await failure(action, { text: "t", voiceId: "v", pronunciationDictionary: "{x" }, ctx))
      .includes("JSON"),
  );
  assert(
    (await failure(action, { text: "t", voiceId: "v", pronunciationDictionary: [1] }, ctx))
      .includes("object"),
  );
  assertEquals(calls.length, 0);
});

Deno.test("synthesize-speech: a 402 fails with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { error_message: "Insufficient characters", error_code: 402 },
  }]);
  assert(
    (await failure(action, { text: "t", voiceId: "v" }, ctx)).includes("Insufficient characters"),
  );
});
