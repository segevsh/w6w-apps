import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `translation/automatic_translation/{provider}`. */
interface Input {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "translate-text",
  title: "Translate Text",
  description: "Translate text into another language with a chosen translation provider.",
  feature: "translation",
  subfeature: "automatic_translation",
  defaultProvider: "google",
  providerHint: "Provider such as google, deepl, amazon, microsoft, modernmt or openai.",
  params: [
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "targetLanguage",
      label: "Target language",
      type: "string",
      required: true,
      hint: "Language code, e.g. fr.",
    },
    {
      key: "sourceLanguage",
      label: "Source language",
      type: "string",
      hint: "Optional; most providers detect it.",
    },
  ],
  buildInput: (i) => ({
    text: i.text,
    target_language: i.targetLanguage,
    source_language: i.sourceLanguage || undefined,
  }),
  promote: [{ key: "text", type: "string", label: "Translated text" }],
});
