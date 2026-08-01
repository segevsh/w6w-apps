import type { ActionDefinition } from "@w6w/types";
import { DeepLClient } from "../lib/client.ts";

interface Input {
  text: string;
  targetLang: string;
  sourceLang?: string;
  splitSentences?: "0" | "1" | "nonewlines";
  preserveFormatting?: boolean;
  formality?: "default" | "more" | "less" | "prefer_more" | "prefer_less";
  glossaryId?: string;
  tagHandling?: "xml" | "html";
  context?: string;
}

interface TranslateResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
    billed_characters?: number;
  }>;
}

interface Output {
  text: string;
  detectedSourceLanguage: string;
  billedCharacters?: number;
}

/**
 * `POST /v2/translate` — translate one piece of text. DeepL's API accepts a
 * `text` array so several strings can be billed in one call; this action
 * models the common single-string workflow step and sends a one-element
 * array. Use the `list-languages` action to discover valid `targetLang` /
 * `sourceLang` codes.
 */
const translateText: ActionDefinition<Input, Output> = {
  key: "translate-text",
  type: "perform",
  resource: "translation",
  title: "Translate Text",
  description: "Translate a piece of text with DeepL.",
  idempotent: true,
  params: [
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "targetLang",
      label: "Target Language",
      type: "string",
      required: true,
      hint: "Language code, e.g. DE, EN-US, FR. See the List Languages action for valid codes.",
    },
    {
      key: "sourceLang",
      label: "Source Language",
      type: "string",
      hint: "Omit to auto-detect.",
    },
    {
      key: "splitSentences",
      label: "Split Sentences",
      type: "select",
      options: [
        { value: "1", label: "On punctuation and newlines (default)" },
        { value: "0", label: "No splitting" },
        { value: "nonewlines", label: "Interpunction only" },
      ],
    },
    { key: "preserveFormatting", label: "Preserve Formatting", type: "boolean" },
    {
      key: "formality",
      label: "Formality",
      type: "select",
      options: [
        { value: "default", label: "Default" },
        { value: "more", label: "More formal" },
        { value: "less", label: "Less formal" },
        { value: "prefer_more", label: "Prefer more formal" },
        { value: "prefer_less", label: "Prefer less formal" },
      ],
      hint: "Not every target language supports formality.",
    },
    { key: "glossaryId", label: "Glossary ID", type: "string" },
    {
      key: "tagHandling",
      label: "Tag Handling",
      type: "select",
      options: [
        { value: "xml", label: "XML" },
        { value: "html", label: "HTML" },
      ],
    },
    {
      key: "context",
      label: "Context",
      type: "text",
      hint: "Extra text to inform the translation without being translated or billed itself.",
    },
  ],
  output: [
    { key: "text", type: "string", label: "Translated text" },
    { key: "detectedSourceLanguage", type: "string", label: "Detected source language" },
    { key: "billedCharacters", type: "number", label: "Billed characters" },
  ],

  async execute(input, ctx) {
    const client = new DeepLClient(ctx);
    const body: Record<string, unknown> = {
      text: [input.text],
      target_lang: input.targetLang,
    };
    if (input.sourceLang) body.source_lang = input.sourceLang;
    if (input.splitSentences !== undefined) body.split_sentences = input.splitSentences;
    if (input.preserveFormatting !== undefined) body.preserve_formatting = input.preserveFormatting;
    if (input.formality) body.formality = input.formality;
    if (input.glossaryId) body.glossary_id = input.glossaryId;
    if (input.tagHandling) body.tag_handling = input.tagHandling;
    if (input.context) body.context = input.context;

    const res = await client.request<TranslateResponse>("/v2/translate", {
      method: "POST",
      body,
    });
    const [translation] = res.translations;
    return {
      text: translation.text,
      detectedSourceLanguage: translation.detected_source_language,
      billedCharacters: translation.billed_characters,
    };
  },
};

export default translateText;
