import type { ActionDefinition } from "@w6w/types";
import { compact, FORMAT_OPTIONS, MurfClient, SAMPLE_RATE_OPTIONS } from "../lib/client.ts";

interface Input {
  text: string;
  voiceId: string;
  locale?: string;
  style?: string;
  rate?: number;
  pitch?: number;
  variation?: number;
  audioDuration?: number;
  format?: string;
  sampleRate?: string;
  channelType?: string;
  encodeAsBase64?: boolean;
  wordDurationsAsOriginalText?: boolean;
  pronunciationDictionary?: unknown;
}

function dictionary(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error("pronunciationDictionary is not valid JSON");
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error("pronunciationDictionary must be an object keyed by word");
  }
  return v as Record<string, unknown>;
}

const synthesizeSpeech: ActionDefinition<Input> = {
  key: "synthesize-speech",
  type: "perform",
  resource: "speech",
  title: "Synthesize Speech",
  description:
    "Convert text to speech with the Gen2 model (POST /v1/speech/generate). Returns a URL to the audio file (or Base64 audio for zero retention), its length, word timings and the characters left in the billing cycle. Consumes characters on every call. Murf's streaming (Falcon 2) endpoints are not covered.",
  idempotent: false,
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "Markup such as `[pause 1s]` is allowed.",
    },
    {
      key: "voiceId",
      label: "Voice ID",
      type: "string",
      required: true,
      placeholder: "en-US-natalie",
      hint: "From List Voices. The bare voice actor name (`natalie`) also works.",
    },
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US" },
    { key: "style", label: "Style", type: "string", placeholder: "Conversational" },
    {
      key: "rate",
      label: "Speed",
      type: "number",
      validation: { min: -50, max: 50, integer: true },
      hint: "-50 to 50.",
    },
    {
      key: "pitch",
      label: "Pitch",
      type: "number",
      validation: { min: -50, max: 50, integer: true },
      hint: "-50 to 50.",
    },
    {
      key: "variation",
      label: "Variation",
      type: "number",
      validation: { min: 0, max: 5, integer: true },
      hint: "0 to 5; more pause, pitch and speed variation. Default 1.",
    },
    {
      key: "audioDuration",
      label: "Audio duration (seconds)",
      type: "number",
      hint: "Target length; 0 or empty is ignored.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      options: FORMAT_OPTIONS,
      hint: "Default WAV.",
    },
    {
      key: "sampleRate",
      label: "Sample rate",
      type: "select",
      options: SAMPLE_RATE_OPTIONS,
      hint: "Default 44100.",
    },
    {
      key: "channelType",
      label: "Channels",
      type: "select",
      options: [{ value: "MONO", label: "Mono" }, { value: "STEREO", label: "Stereo" }],
    },
    {
      key: "encodeAsBase64",
      label: "Return Base64 audio",
      type: "boolean",
      hint: "Zero retention: audio comes back inline in `encodedAudio` instead of a URL.",
    },
    {
      key: "wordDurationsAsOriginalText",
      label: "Word durations as original text",
      type: "boolean",
      hint: "English only.",
    },
    {
      key: "pronunciationDictionary",
      label: "Pronunciation dictionary",
      type: "json",
      hint:
        'Object keyed by word, e.g. {"live": {"type": "IPA", "pronunciation": "laɪv"}, "2010": {"type": "SAY_AS", "pronunciation": "two thousand and ten"}}.',
    },
  ],
  output: [
    { key: "audioFile", type: "string", label: "Audio file URL (expires; download it)" },
    { key: "audioLengthInSeconds", type: "number", label: "Audio length (s)" },
    { key: "encodedAudio", type: "string", label: "Base64 audio (when requested)" },
    { key: "remainingCharacterCount", type: "number", label: "Characters left this cycle" },
    { key: "warning", type: "string", label: "Warning" },
    { key: "wordDurations", type: "array", label: "Word timings" },
  ],

  async execute(input, ctx) {
    if (!input.text?.trim()) throw new Error("text is required");
    if (!input.voiceId?.trim()) throw new Error("voiceId is required");
    const payload = compact({
      text: input.text,
      voiceId: input.voiceId,
      locale: input.locale,
      style: input.style,
      rate: input.rate,
      pitch: input.pitch,
      variation: input.variation,
      audioDuration: input.audioDuration,
      format: input.format,
      sampleRate: input.sampleRate === undefined || input.sampleRate === ""
        ? undefined
        : Number(input.sampleRate),
      channelType: input.channelType,
      encodeAsBase64: input.encodeAsBase64,
      wordDurationsAsOriginalText: input.wordDurationsAsOriginalText,
      pronunciationDictionary: dictionary(input.pronunciationDictionary),
    });
    return await new MurfClient(ctx).call("/v1/speech/generate", { method: "POST", body: payload });
  },
};

export default synthesizeSpeech;
