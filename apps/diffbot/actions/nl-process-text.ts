import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient, NL_HOST, splitList } from "../lib/client.ts";

interface Input {
  content: string;
  fields?: string;
  lang?: string;
  format?: string;
  documentType?: string;
  summarySentences?: number;
}

/**
 * `POST https://nl.diffbot.com/v1/?fields=…` — entities, sentiment, facts, summary
 * and categories from raw text.
 *
 * The vendor's curl example (and its response) wrap the document in an ARRAY —
 * `[{"content": "…"}]` → `[{…}]` — while the request schema above it describes a
 * bare object. This sends the array form the example uses and accepts either shape
 * back. 1 credit per 10,000 characters; at most 100,000 characters per document.
 */
const nlProcessText: ActionDefinition<Input> = {
  key: "nl-process-text",
  type: "read",
  resource: "text",
  title: "Analyze Text (Natural Language)",
  description: "Extract entities, sentiment, facts, categories and a summary from raw text " +
    "with Diffbot's Natural Language API. 1 credit per 10,000 characters.",
  params: [
    {
      key: "content",
      label: "Text",
      type: "text",
      required: true,
      hint: "1 to 100,000 characters.",
      validation: { minLength: 1, maxLength: 100000 },
    },
    {
      key: "fields",
      label: "Fields to return",
      type: "string",
      default: "entities,sentiment,facts,records,sentences",
      hint: "Comma-separated. Also available: categories, summary.",
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      default: "auto",
      hint: "ISO 639-1 code, or auto. Entities and salience: en, fr, es, zh, de, ru, ja, nl, pl, " +
        "no, da, sv, it. Facts: English only.",
    },
    {
      key: "format",
      label: "Text format",
      type: "select",
      options: [
        { value: "plain text", label: "plain text" },
        {
          value: "plain text with title",
          label: "plain text with title (title, blank line, body)",
        },
      ],
    },
    {
      key: "documentType",
      label: "Document type",
      type: "string",
      hint: "Optional context for the model, e.g. news article.",
    },
    {
      key: "summarySentences",
      label: "Summary length (sentences)",
      type: "number",
      hint: "With the summary field. 1-10, default 3.",
      validation: { min: 1, max: 10, integer: true },
    },
  ],
  output: [
    { key: "language", type: "string", label: "Detected language (ISO 639-1)" },
    { key: "sentiment", type: "number", label: "Document sentiment, -1 to 1" },
    { key: "entities", type: "array", label: "Entities with salience, sentiment and mentions" },
    { key: "facts", type: "array", label: "Facts extracted against Diffbot's schema" },
    { key: "records", type: "array", label: "Knowledge Graph-shaped records" },
    { key: "categories", type: "object", label: "Categories (iabv1, iabv2, diffbot)" },
    { key: "sentences", type: "array", label: "Sentence offsets" },
    { key: "summary", type: "string", label: "Generated summary" },
    { key: "errors", type: "array", label: "Errors the vendor reported" },
  ],

  async execute(input, ctx) {
    const doc = compact({
      content: input.content,
      lang: input.lang,
      format: input.format,
      documentType: input.documentType,
      customSummary: input.summarySentences
        ? { maxNumberOfSentences: input.summarySentences }
        : undefined,
    });
    const fields = splitList(input.fields);
    const { body } = await new DiffbotClient(ctx).request("/v1/", {
      host: NL_HOST,
      method: "POST",
      query: { fields: fields.length ? fields.join(",") : undefined },
      json: [doc],
    });
    const r = (Array.isArray(body) ? body[0] : body ?? {}) as Record<string, unknown>;
    return {
      language: r.language,
      sentiment: r.sentiment,
      entities: r.entities ?? [],
      facts: r.facts ?? [],
      records: r.records ?? [],
      categories: r.categories ?? null,
      sentences: r.sentences ?? [],
      summary: r.summary,
      errors: r.errors ?? [],
    };
  },
};

export default nlProcessText;
