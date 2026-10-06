import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `text/anonymization/{provider}`. */
interface Input {
  text: string;
  language?: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "text-anonymize",
  title: "Anonymize Text",
  description: "Detect personal information in text and return it with the personal data redacted.",
  feature: "text",
  subfeature: "anonymization",
  defaultProvider: "amazon",
  providerHint: "Provider such as amazon or microsoft.",
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
