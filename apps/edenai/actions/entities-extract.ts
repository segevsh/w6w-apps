import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `text/named_entity_recognition/{provider}`. */
interface Input {
  text: string;
  language?: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "entities-extract",
  title: "Extract Named Entities",
  description: "Find people, places, organizations and other named entities in text.",
  feature: "text",
  subfeature: "named_entity_recognition",
  defaultProvider: "amazon",
  providerHint: "Provider such as amazon, microsoft, openai or tenstorrent.",
  params: [
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "language",
      label: "Language",
      type: "string",
      hint: "ISO 639-1 code, e.g. en. Optional.",
    },
  ],
  buildInput: (i) => ({ text: i.text, language: i.language || undefined }),
  promote: [],
});
