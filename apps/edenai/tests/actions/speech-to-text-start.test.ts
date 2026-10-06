import { assertEquals } from "@std/assert";
import start from "../../actions/speech-to-text-start.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("speech-to-text-start: maps every option onto the feature's input fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: {
      status: "processing",
      provider: "openai",
      feature: "audio",
      subfeature: "speech_to_text_async",
      public_id: "job-2",
    },
  }]);
  const out = await start.execute({
    file: "https://x/a.mp3",
    language: "en",
    speakers: 2,
    profanityFilter: false,
    vocabulary: "Eden, w6w",
    provider: "openai",
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai/async");
  assertEquals(bodyOf(calls[0]), {
    model: "audio/speech_to_text_async/openai",
    input: {
      file: "https://x/a.mp3",
      language: "en",
      speakers: 2,
      profanity_filter: false,
      vocabulary: ["Eden", "w6w"],
    },
  });
  assertEquals(out.jobId, "job-2");
});

Deno.test("speech-to-text-start: unset options are omitted from the input", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "processing", public_id: "j" } }]);
  await start.execute({ file: "f", provider: "deepgram/nova-3" }, ctx);
  assertEquals(bodyOf(calls[0]).input, { file: "f" });
  assertEquals(bodyOf(calls[0]).model, "audio/speech_to_text_async/deepgram/nova-3");
});
