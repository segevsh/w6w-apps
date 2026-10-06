import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transcription-start.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const created = { id: "j1", result_url: "https://api.gladia.io/v2/pre-recorded/j1" };

Deno.test("transcription-start: minimal call posts only audio_url to /v2/pre-recorded", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  const out = await action.execute({ audioUrl: "https://x.test/a.mp3" }, ctx);
  assertEquals(out, created);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.gladia.io/v2/pre-recorded");
  assertEquals(JSON.parse(calls[0].body!), { audio_url: "https://x.test/a.mp3" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals("x-gladia-key" in calls[0].headers, false);
});

Deno.test("transcription-start: maps every feature to its boolean + config pair", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  await action.execute({
    audioUrl: "u",
    model: "solaria-3",
    languages: "fr, en",
    codeSwitching: false,
    diarization: true,
    numberOfSpeakers: 2,
    subtitles: true,
    subtitleFormats: ["vtt"],
    translationTargetLanguages: "de",
    translationModel: "enhanced",
    summarization: true,
    summaryType: "concise",
    sentences: true,
    namedEntityRecognition: true,
    sentimentAnalysis: true,
    customVocabulary: "Gladia\nSolaria",
    customSpelling: { Gladia: ["gladdia"] },
    piiRedaction: true,
    piiEntityTypes: ["GDPR"],
    piiProcessedTextType: "MASK",
    callbackUrl: "https://hook.test/cb",
    callbackMethod: "PUT",
    customMetadata: { user: "a" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    audio_url: "u",
    model: "solaria-3",
    language_config: { languages: ["fr", "en"], code_switching: false },
    diarization: true,
    diarization_config: { number_of_speakers: 2 },
    subtitles: true,
    subtitles_config: { formats: ["vtt"] },
    translation: true,
    translation_config: { target_languages: ["de"], model: "enhanced" },
    summarization: true,
    summarization_config: { type: "concise" },
    sentences: true,
    named_entity_recognition: true,
    sentiment_analysis: true,
    custom_vocabulary: true,
    custom_vocabulary_config: { vocabulary: ["Gladia", "Solaria"] },
    custom_spelling: true,
    custom_spelling_config: { spelling_dictionary: { Gladia: ["gladdia"] } },
    pii_redaction: true,
    pii_redaction_config: { entity_types: ["GDPR"], processed_text_type: "MASK" },
    callback: true,
    callback_config: { url: "https://hook.test/cb", method: "PUT" },
    custom_metadata: { user: "a" },
  });
});

Deno.test("transcription-start: switched-off features send nothing; additionalOptions merges last", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  await action.execute({
    audioUrl: "u",
    diarization: false,
    subtitles: false,
    summarization: false,
    additionalOptions: { display_mode: true, audio_url: "override" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { audio_url: "override", display_mode: true });
});

Deno.test("transcription-start: a 422 surfaces the vendor message and request_id", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody(422, "Invalid parameter") }]);
  const err = await assertRejects(async () => await action.execute({ audioUrl: "u" }, ctx), Error);
  assertEquals(err.message.includes("422"), true);
  assertEquals(err.message.includes("Invalid parameter"), true);
  assertEquals(err.message.includes("G-abc"), true);
});

Deno.test("transcription-start: declared non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
