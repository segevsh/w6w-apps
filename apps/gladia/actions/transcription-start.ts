import type { ActionDefinition } from "@w6w/types";
import { GladiaClient, toList } from "../lib/client.ts";
import { modelOptions, piiPresets } from "../lib/params.ts";

/**
 * `POST /v2/pre-recorded` — start an asynchronous transcription job (HTTP 201 with `id`
 * and `result_url`). The job runs in the background: poll `transcription-get` until
 * `status` is `done` or `error`, or set a callback URL.
 *
 * Every optional section follows the vendor's `<feature>: boolean` + `<feature>_config`
 * pair; the pair is only sent when the feature is switched on here.
 */
interface Input {
  audioUrl: string;
  model?: string;
  languages?: string;
  codeSwitching?: boolean;
  diarization?: boolean;
  numberOfSpeakers?: number;
  minSpeakers?: number;
  maxSpeakers?: number;
  subtitles?: boolean;
  subtitleFormats?: string[];
  translationTargetLanguages?: string;
  translationModel?: string;
  summarization?: boolean;
  summaryType?: string;
  sentences?: boolean;
  namedEntityRecognition?: boolean;
  sentimentAnalysis?: boolean;
  customVocabulary?: string;
  customSpelling?: Record<string, string[]>;
  piiRedaction?: boolean;
  piiEntityTypes?: string[];
  piiProcessedTextType?: string;
  callbackUrl?: string;
  callbackMethod?: string;
  customMetadata?: Record<string, unknown>;
  additionalOptions?: Record<string, unknown>;
}

const transcriptionStart: ActionDefinition<Input> = {
  key: "transcription-start",
  type: "perform",
  resource: "transcription",
  title: "Start Transcription",
  description: "Start an asynchronous pre-recorded transcription job from an audio or video URL. " +
    "Returns the job id; fetch the result with Get Transcription.",
  // A second call starts a second job (and bills it). Gladia's retry policy: after a 2xx do
  // not resubmit.
  idempotent: false,
  params: [
    {
      key: "audioUrl",
      label: "Audio URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/call.mp3",
      hint: "A public URL to an audio or video file, or the `audio_url` from Upload Audio URL. " +
        "Max 135 minutes, 1000 MB, 2 channels.",
    },
    {
      key: "model",
      label: "Model",
      type: "select",
      options: modelOptions,
      hint: "Omit for Gladia's default (solaria-1).",
    },
    {
      key: "languages",
      label: "Languages",
      type: "string",
      placeholder: "en, fr",
      hint: "Comma-separated ISO 639-1 codes. One code fixes the language; several (or none) " +
        "let the model detect it. solaria-3 accepts exactly one.",
    },
    { key: "codeSwitching", label: "Code switching", type: "boolean", advanced: true },
    { key: "diarization", label: "Speaker diarization", type: "boolean" },
    {
      key: "numberOfSpeakers",
      label: "Exact number of speakers",
      type: "number",
      advanced: true,
      showIf: { "var": "diarization" },
      validation: { min: 1, integer: true },
    },
    {
      key: "minSpeakers",
      label: "Minimum speakers",
      type: "number",
      advanced: true,
      showIf: { "var": "diarization" },
      validation: { min: 0, integer: true },
    },
    {
      key: "maxSpeakers",
      label: "Maximum speakers",
      type: "number",
      advanced: true,
      showIf: { "var": "diarization" },
      validation: { min: 0, integer: true },
    },
    { key: "subtitles", label: "Generate subtitles", type: "boolean" },
    {
      key: "subtitleFormats",
      label: "Subtitle formats",
      type: "multiselect",
      showIf: { "var": "subtitles" },
      options: [{ value: "srt", label: "SRT" }, { value: "vtt", label: "VTT" }],
      hint: "Defaults to SRT.",
    },
    {
      key: "translationTargetLanguages",
      label: "Translate into",
      type: "string",
      placeholder: "fr, de",
      hint: "Comma-separated ISO 639-1 target languages. Leave empty for no translation (beta).",
    },
    {
      key: "translationModel",
      label: "Translation model",
      type: "select",
      advanced: true,
      options: [
        { value: "base", label: "Base" },
        { value: "enhanced", label: "Enhanced" },
        { value: "batch", label: "Batch (default)" },
      ],
    },
    { key: "summarization", label: "Summarization", type: "boolean" },
    {
      key: "summaryType",
      label: "Summary type",
      type: "select",
      showIf: { "var": "summarization" },
      options: [
        { value: "general", label: "General (default)" },
        { value: "bullet_points", label: "Bullet points" },
        { value: "concise", label: "Concise" },
      ],
    },
    { key: "sentences", label: "Sentence segmentation", type: "boolean", advanced: true },
    {
      key: "namedEntityRecognition",
      label: "Named entity recognition",
      type: "boolean",
      advanced: true,
      hint: "Alpha feature.",
    },
    { key: "sentimentAnalysis", label: "Sentiment analysis", type: "boolean", advanced: true },
    {
      key: "customVocabulary",
      label: "Custom vocabulary",
      type: "text",
      advanced: true,
      hint: "Comma- or newline-separated terms to bias the model toward (beta).",
    },
    {
      key: "customSpelling",
      label: "Custom spelling",
      type: "json",
      advanced: true,
      hint: 'Object mapping a preferred spelling to its variants, e.g. {"Gladia": ["gladdia"]} ' +
        "(alpha).",
    },
    { key: "piiRedaction", label: "PII redaction", type: "boolean", advanced: true },
    {
      key: "piiEntityTypes",
      label: "PII presets to redact",
      type: "multiselect",
      advanced: true,
      showIf: { "var": "piiRedaction" },
      options: piiPresets,
      hint: "Individual entity types (NAME, EMAIL_ADDRESS, …) can be passed through " +
        "Additional options instead.",
    },
    {
      key: "piiProcessedTextType",
      label: "PII replacement",
      type: "select",
      advanced: true,
      showIf: { "var": "piiRedaction" },
      options: [
        { value: "MARKER", label: "Marker, e.g. [NAME_1] (default)" },
        { value: "MASK", label: "Mask, e.g. ####" },
      ],
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      advanced: true,
      hint: "Gladia calls this URL with the result when the job finishes (success or error).",
    },
    {
      key: "callbackMethod",
      label: "Callback method",
      type: "select",
      advanced: true,
      options: [{ value: "POST", label: "POST (default)" }, { value: "PUT", label: "PUT" }],
    },
    {
      key: "customMetadata",
      label: "Custom metadata",
      type: "json",
      advanced: true,
      hint: "Free-form object stored on the job and returned on Get/List.",
    },
    {
      key: "additionalOptions",
      label: "Additional options",
      type: "json",
      advanced: true,
      hint: "Extra top-level request fields (e.g. audio_to_llm, display_mode), merged over the " +
        "fields above.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "result_url", type: "string", label: "URL the result can be fetched from" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { audio_url: input.audioUrl };
    if (input.model) body.model = input.model;

    const languages = toList(input.languages);
    if (languages.length || input.codeSwitching !== undefined) {
      const cfg: Record<string, unknown> = {};
      if (languages.length) cfg.languages = languages;
      if (input.codeSwitching !== undefined) cfg.code_switching = input.codeSwitching;
      body.language_config = cfg;
    }

    if (input.diarization) {
      body.diarization = true;
      const cfg: Record<string, unknown> = {};
      if (input.numberOfSpeakers !== undefined) cfg.number_of_speakers = input.numberOfSpeakers;
      if (input.minSpeakers !== undefined) cfg.min_speakers = input.minSpeakers;
      if (input.maxSpeakers !== undefined) cfg.max_speakers = input.maxSpeakers;
      if (Object.keys(cfg).length) body.diarization_config = cfg;
    }

    if (input.subtitles) {
      body.subtitles = true;
      const formats = toList(input.subtitleFormats);
      if (formats.length) body.subtitles_config = { formats };
    }

    const targets = toList(input.translationTargetLanguages);
    if (targets.length) {
      body.translation = true;
      body.translation_config = {
        target_languages: targets,
        ...(input.translationModel ? { model: input.translationModel } : {}),
      };
    }

    if (input.summarization) {
      body.summarization = true;
      if (input.summaryType) body.summarization_config = { type: input.summaryType };
    }
    if (input.sentences) body.sentences = true;
    if (input.namedEntityRecognition) body.named_entity_recognition = true;
    if (input.sentimentAnalysis) body.sentiment_analysis = true;

    const vocabulary = toList(input.customVocabulary);
    if (vocabulary.length) {
      body.custom_vocabulary = true;
      body.custom_vocabulary_config = { vocabulary };
    }
    if (input.customSpelling && Object.keys(input.customSpelling).length) {
      body.custom_spelling = true;
      body.custom_spelling_config = { spelling_dictionary: input.customSpelling };
    }

    if (input.piiRedaction) {
      body.pii_redaction = true;
      const cfg: Record<string, unknown> = {};
      const types = toList(input.piiEntityTypes);
      if (types.length) cfg.entity_types = types;
      if (input.piiProcessedTextType) cfg.processed_text_type = input.piiProcessedTextType;
      if (Object.keys(cfg).length) body.pii_redaction_config = cfg;
    }

    if (input.callbackUrl) {
      body.callback = true;
      body.callback_config = {
        url: input.callbackUrl,
        ...(input.callbackMethod ? { method: input.callbackMethod } : {}),
      };
    }
    if (input.customMetadata && Object.keys(input.customMetadata).length) {
      body.custom_metadata = input.customMetadata;
    }
    if (input.additionalOptions) Object.assign(body, input.additionalOptions);

    return new GladiaClient(ctx).json("/v2/pre-recorded", { method: "POST", body });
  },
};

export default transcriptionStart;
