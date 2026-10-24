import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  json,
  keepAlive,
  OllamaClient,
  optionalNumber,
  requiredString,
  usage,
} from "../lib/client.ts";

/**
 * `POST /api/embed` — vector embeddings for one text or a batch.
 *
 * This is `/api/embed`, not the older `/api/embeddings`, which takes one
 * `prompt` and is deprecated. The current endpoint takes `input` as a string or
 * a list, L2-normalises the vectors, and returns `embeddings` — always a list of
 * vectors, even for one input.
 *
 * Use an embedding model (`nomic-embed-text`, `mxbai-embed-large`, …). A chat
 * model will often answer, with vectors that are poor for search.
 */
const action: ActionDefinition = {
  key: "embed",
  type: "perform",
  resource: "generation",
  title: "Create embeddings",
  description:
    "Turn text into embedding vectors with an embedding model on your Ollama server. Takes one " +
    "string or a JSON array of strings and always returns a list of vectors.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "nomic-embed-text",
      hint: "An embedding model installed on the server.",
    },
    {
      key: "input",
      label: "Input",
      type: "text",
      required: true,
      default: "",
      hint: 'One text, or a JSON array of texts for a batch: ["first", "second"]. A text that ' +
        "starts with `[` is read as a JSON array.",
    },
    {
      key: "truncate",
      label: "Truncate To Context",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Ollama's default is to truncate an input longer than the model's context. Turn " +
        "off to get an error instead.",
    },
    {
      key: "dimensions",
      label: "Dimensions",
      type: "number",
      advanced: true,
      hint: "Shorten the vector, for models that support it. Others ignore or reject it.",
    },
    {
      key: "keepAlive",
      label: "Keep Alive",
      type: "string",
      default: "",
      placeholder: "5m",
      advanced: true,
      hint: "How long the model stays loaded after this call. Blank uses the server default.",
    },
  ],
  output: [
    { key: "embeddings", type: "array", label: "One vector per input, in order" },
    { key: "count", type: "number", label: "How many vectors" },
    { key: "dimensions", type: "number", label: "Length of each vector" },
    { key: "model", type: "string", label: "The model that answered" },
    { key: "promptTokens", type: "number", label: "Tokens in the input" },
    { key: "totalSeconds", type: "number", label: "Total wall time" },
    { key: "loadSeconds", type: "number", label: "Time spent loading the model" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = requiredString(p.model, "model");

    let text: string | string[];
    const raw = typeof p.input === "string" ? p.input : undefined;
    if (Array.isArray(p.input)) text = p.input.map(String);
    else if (raw !== undefined && raw.trimStart().startsWith("[")) {
      const list = json(raw, "input");
      if (!Array.isArray(list)) throw new Error("`input` must be a string or an array of strings");
      text = list.map(String);
    } else {
      text = String(p.input ?? "");
    }
    if (Array.isArray(text) ? text.length === 0 : !text.trim()) {
      throw new Error("`input` is required");
    }

    const r = await new OllamaClient(ctx).request<Record<string, unknown>>("/api/embed", {
      method: "POST",
      body: compact({
        model,
        input: text,
        truncate: p.truncate === false ? false : undefined,
        dimensions: optionalNumber(p.dimensions, "dimensions"),
        keep_alive: keepAlive(p.keepAlive),
      }),
    });

    const embeddings = Array.isArray(r?.embeddings) ? r.embeddings as number[][] : [];
    return {
      embeddings,
      count: embeddings.length,
      dimensions: embeddings[0]?.length,
      model: r?.model,
      ...usage(r),
    };
  },
};

export default action;
