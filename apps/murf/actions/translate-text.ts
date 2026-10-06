import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

interface Input {
  targetLanguage: string;
  texts: unknown;
}

/** One text per line (a JSON array is also accepted). */
function textsOf(value: unknown): string[] {
  let v = value;
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try {
      v = JSON.parse(v);
    } catch { /* fall through: treat as lines */ }
  }
  const items = Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split("\n") : [];
  const out = items.filter((s) => s.trim().length > 0);
  if (out.length === 0) throw new Error("texts must contain at least one non-empty text");
  return out;
}

const translateText: ActionDefinition<Input> = {
  key: "translate-text",
  type: "perform",
  resource: "translation",
  title: "Translate Text",
  description:
    "Translate one or more texts into a target language (POST /v1/text/translate). Costs Murf credits; the response reports `metadata.credits_used`.",
  idempotent: true,
  params: [
    {
      key: "targetLanguage",
      label: "Target language",
      type: "string",
      required: true,
      placeholder: "es_ES",
      hint: "Murf language code such as es_ES, fr_FR or de_DE.",
    },
    {
      key: "texts",
      label: "Texts",
      type: "text",
      required: true,
      hint: "One text per line, or a JSON array of strings.",
    },
  ],
  output: [
    { key: "translations", type: "array", label: "source_text / translated_text pairs" },
    {
      key: "metadata",
      type: "object",
      label: "Character counts, credits used and target language",
    },
  ],

  async execute(input, ctx) {
    if (!input.targetLanguage?.trim()) throw new Error("targetLanguage is required");
    return await new MurfClient(ctx).call("/v1/text/translate", {
      method: "POST",
      body: { targetLanguage: input.targetLanguage.trim(), texts: textsOf(input.texts) },
    });
  },
};

export default translateText;
