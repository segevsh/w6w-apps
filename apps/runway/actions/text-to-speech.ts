import { generationAction, modelParam, SEED } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  promptText: string;
  presetVoiceId?: string;
  referenceAudioUri?: string;
  outputFormat?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  languageCode?: string;
  seed?: number;
}

/**
 * `POST /v1/text_to_speech`. The `eleven_*` models require `voice` = `{ type: "runway-preset",
 * presetId }`; `seed_audio` takes an optional `voice` = `{ type: "reference-audio", audioUri }`.
 * `speed`, `stability`, `similarityBoost`, `style` and `languageCode` are ElevenLabs-model fields.
 */
export default generationAction<Input>({
  key: "text-to-speech",
  title: "Text to Speech",
  description: "Start a speech generation from a script.",
  path: "/v1/text_to_speech",
  params: [
    modelParam("A speech model id: eleven_v4, eleven_v3, eleven_multilingual_v2 or seed_audio."),
    {
      key: "promptText",
      label: "Script",
      type: "text",
      required: true,
      hint: "Up to 2,048 characters (2,500 for eleven_v4).",
    },
    {
      key: "presetVoiceId",
      label: "Preset voice",
      type: "string",
      hint: "A Runway preset voice name, e.g. Maya. Required for the eleven_* models.",
    },
    {
      key: "referenceAudioUri",
      label: "Reference voice audio URI",
      type: "string",
      hint: "seed_audio only: clone the voice in this audio.",
    },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      options: ["wav", "mp3", "ogg_opus"].map((v) => ({ value: v, label: v })),
    },
    { key: "speed", label: "Speed", type: "number", validation: { min: 0.7, max: 1.2 } },
    { key: "stability", label: "Stability", type: "number", validation: { min: 0, max: 1 } },
    {
      key: "similarityBoost",
      label: "Similarity boost",
      type: "number",
      validation: { min: 0, max: 1 },
    },
    { key: "style", label: "Style", type: "number", validation: { min: 0, max: 1 } },
    { key: "languageCode", label: "Language code", type: "string" },
    SEED,
  ],
  build: (i) => {
    const preset = String(i.presetVoiceId ?? "").trim();
    const ref = String(i.referenceAudioUri ?? "").trim();
    return {
      promptText: i.promptText,
      voice: preset
        ? { type: "runway-preset", presetId: preset }
        : ref
        ? { type: "reference-audio", audioUri: ref }
        : undefined,
      outputFormat: i.outputFormat,
      speed: i.speed,
      stability: i.stability,
      similarityBoost: i.similarityBoost,
      style: i.style,
      languageCode: i.languageCode,
      seed: i.seed,
    };
  },
});
