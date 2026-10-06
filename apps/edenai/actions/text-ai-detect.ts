import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `text/ai_detection/{provider}`. */
interface Input {
  text: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "text-ai-detect",
  title: "Detect AI-Generated Text",
  description: "Estimate whether text was written by an AI chatbot or language model.",
  feature: "text",
  subfeature: "ai_detection",
  defaultProvider: "sapling",
  providerHint: "Provider such as sapling or winstonai.",
  params: [
    { key: "text", label: "Text", type: "text", required: true },
  ],
  buildInput: (i) => ({ text: i.text }),
  promote: [],
});
