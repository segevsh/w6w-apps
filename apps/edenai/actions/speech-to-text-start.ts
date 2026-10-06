import { defineUniversalAsync } from "../lib/universal.ts";
import { list } from "../lib/client.ts";

/** `POST /v3/universal-ai/async` - model `audio/speech_to_text_async/{provider}`. */
interface Input {
  file: string;
  language?: string;
  speakers?: number;
  profanityFilter?: boolean;
  vocabulary?: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
  webhookReceiver?: string;
}

export default defineUniversalAsync<Input>({
  key: "speech-to-text-start",
  title: "Start Speech-to-Text",
  description: "Transcribe an audio file, with optional speaker diarization.",
  feature: "audio",
  subfeature: "speech_to_text_async",
  defaultProvider: "openai",
  providerHint: "Provider such as openai, assembly, deepgram, gladia, google, amazon or microsoft.",
  params: [
    {
      key: "file",
      label: "Audio file URL or ID",
      type: "string",
      required: true,
      hint: "A public file URL, or a file id from Eden AI Upload File.",
    },
    { key: "language", label: "Language", type: "string", hint: "ISO code, e.g. en, fr, es." },
    { key: "speakers", label: "Speakers", type: "number", validation: { min: 1, integer: true } },
    { key: "profanityFilter", label: "Filter profanity", type: "boolean" },
    {
      key: "vocabulary",
      label: "Custom vocabulary",
      type: "string",
      hint: "Comma-separated words the engine should recognize.",
    },
  ],
  buildInput: (i) => ({
    file: i.file,
    language: i.language || undefined,
    speakers: i.speakers || undefined,
    profanity_filter: i.profanityFilter === undefined ? undefined : i.profanityFilter,
    vocabulary: list(i.vocabulary).length ? list(i.vocabulary) : undefined,
  }),
});
