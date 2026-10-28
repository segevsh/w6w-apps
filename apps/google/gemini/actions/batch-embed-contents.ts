import type { ActionDefinition } from "@w6w/types";
import { GeminiClient, modelResource } from "../lib/client.ts";

interface Input {
  model: string;
  texts: string[];
  taskType?: string;
}

/**
 * `batchEmbedContents` — up to many texts in one call, all embedded by the
 * same `model` (the API requires every sub-request's `model` to match the
 * batch's). Response embeddings come back in request order (per the API
 * reference), so callers can zip them back onto `texts` by index.
 */
const batchEmbedContents: ActionDefinition<Input> = {
  key: "batch-embed-contents",
  type: "perform",
  resource: "embedding",
  title: "Batch Embed Content",
  description: "Generate embedding vectors for several texts in one call, using the same model.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "gemini-embedding-001",
    },
    {
      key: "texts",
      label: "Texts",
      type: "json",
      required: true,
      hint: "JSON array of strings, one per embedding, in the order results are returned.",
    },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      hint: "Applied to every text in the batch.",
      options: [
        { value: "RETRIEVAL_QUERY", label: "Retrieval query" },
        { value: "RETRIEVAL_DOCUMENT", label: "Retrieval document" },
        { value: "SEMANTIC_SIMILARITY", label: "Semantic similarity" },
        { value: "CLASSIFICATION", label: "Classification" },
        { value: "CLUSTERING", label: "Clustering" },
        { value: "QUESTION_ANSWERING", label: "Question answering" },
        { value: "FACT_VERIFICATION", label: "Fact verification" },
        { value: "CODE_RETRIEVAL_QUERY", label: "Code retrieval query" },
      ],
    },
  ],
  output: [
    { key: "embeddings", type: "array", label: "Embeddings" },
    { key: "usageMetadata", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new GeminiClient(ctx);
    const model = modelResource(input.model);
    const requests = input.texts.map((text) => ({
      model,
      content: { parts: [{ text }] },
      ...(input.taskType ? { embedContentConfig: { taskType: input.taskType } } : {}),
    }));

    return client.request(`/${model}:batchEmbedContents`, {
      method: "POST",
      body: { requests },
    });
  },
};

export default batchEmbedContents;
