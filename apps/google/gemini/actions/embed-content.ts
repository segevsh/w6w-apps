import type { ActionDefinition } from "@w6w/types";
import { GeminiClient, modelResource } from "../lib/client.ts";

type TaskType =
  | "RETRIEVAL_QUERY"
  | "RETRIEVAL_DOCUMENT"
  | "SEMANTIC_SIMILARITY"
  | "CLASSIFICATION"
  | "CLUSTERING"
  | "QUESTION_ANSWERING"
  | "FACT_VERIFICATION"
  | "CODE_RETRIEVAL_QUERY";

interface Input {
  model: string;
  text: string;
  taskType?: TaskType;
  title?: string;
  outputDimensionality?: number;
}

/**
 * `embedContent` — a single text embedding. `text` is wrapped as the sole
 * text `Part` of a `Content`; the API's `content.parts` can in principle carry
 * more, but only text parts are counted, so this action does not expose that.
 */
const embedContent: ActionDefinition<Input> = {
  key: "embed-content",
  type: "perform",
  resource: "embedding",
  title: "Embed Content",
  description: "Generate a text embedding vector for one piece of text.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "gemini-embedding-001",
    },
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      hint: "Improves embedding quality for the intended use.",
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
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Only used when task type is Retrieval document.",
    },
    { key: "outputDimensionality", label: "Output dimensionality", type: "number" },
  ],
  output: [
    { key: "embedding", type: "object", label: "Embedding" },
    { key: "usageMetadata", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new GeminiClient(ctx);
    const embedContentConfig: Record<string, unknown> = {};
    if (input.taskType) embedContentConfig.taskType = input.taskType;
    if (input.title) embedContentConfig.title = input.title;
    if (input.outputDimensionality !== undefined) {
      embedContentConfig.outputDimensionality = input.outputDimensionality;
    }

    const body: Record<string, unknown> = {
      content: { parts: [{ text: input.text }] },
    };
    if (Object.keys(embedContentConfig).length > 0) {
      body.embedContentConfig = embedContentConfig;
    }

    return client.request(`/${modelResource(input.model)}:embedContent`, {
      method: "POST",
      body,
    });
  },
};

export default embedContent;
