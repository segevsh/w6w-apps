import type { ActionDefinition } from "@w6w/types";
import { compact, resolvePublisherModel, VertexClient } from "../lib/client.ts";
import { modelParams } from "../lib/publisher.ts";

interface EmbedResponse {
  embedding?: { values?: number[] };
  truncated?: boolean;
}

const TASK_TYPES = [
  "RETRIEVAL_QUERY",
  "RETRIEVAL_DOCUMENT",
  "SEMANTIC_SIMILARITY",
  "CLASSIFICATION",
  "CLUSTERING",
  "QUESTION_ANSWERING",
  "FACT_VERIFICATION",
  "CODE_RETRIEVAL_QUERY",
];

/**
 * `POST …/publishers/google/models/{m}:embedContent` — verified against the
 * discovery document (`projects.locations.publishers.models.embedContent`).
 * Embeds ONE piece of content; the request's top-level `taskType`, `title`,
 * `outputDimensionality` and `autoTruncate` are marked deprecated there, so this
 * sends the replacement `embedContentConfig` instead.
 */
const action: ActionDefinition = {
  key: "embed-content",
  type: "perform",
  resource: "embedding",
  title: "Embed text",
  description: "Turn a piece of text into an embedding vector on Vertex AI.",
  // Deterministic for a given model version; safe to retry.
  idempotent: true,
  params: [
    ...modelParams("gemini-embedding-001"),
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      options: TASK_TYPES.map((t) => ({ value: t, label: t })),
      hint: "Only applies to text-only embedding models.",
    },
    {
      key: "outputDimensionality",
      label: "Output dimensionality",
      type: "number",
      hint: "Truncate the vector to this many values.",
    },
    { key: "title", label: "Title", type: "string", hint: "For RETRIEVAL_DOCUMENT." },
    { key: "autoTruncate", label: "Auto truncate", type: "boolean" },
  ],
  output: [
    { key: "values", type: "array", label: "Embedding vector" },
    { key: "truncated", type: "boolean", label: "Input was truncated" },
    { key: "usageMetadata", type: "object", label: "Token usage" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const target = resolvePublisherModel(ctx.connection, p);
    const text = String(p.text ?? "");
    if (!text) throw new Error("`text` is required");
    const embedContentConfig = compact({
      taskType: p.taskType,
      outputDimensionality: p.outputDimensionality,
      title: p.title,
      autoTruncate: p.autoTruncate === true ? true : undefined,
    });
    const res = await new VertexClient(ctx).request<EmbedResponse & Record<string, unknown>>(
      target.location,
      `${target.name}:embedContent`,
      {
        method: "POST",
        body: compact({
          content: { parts: [{ text }] },
          embedContentConfig: Object.keys(embedContentConfig).length
            ? embedContentConfig
            : undefined,
        }),
      },
    );
    return {
      values: res?.embedding?.values ?? [],
      truncated: res?.truncated === true,
      usageMetadata: res?.usageMetadata,
    };
  },
};

export default action;
