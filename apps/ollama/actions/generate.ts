import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  format,
  images,
  keepAlive,
  modelOptions,
  OllamaClient,
  optionalString,
  requiredString,
  think,
  usage,
} from "../lib/client.ts";

/**
 * `POST /api/generate` — one completion from a prompt, with `stream: false`.
 *
 * ## Why `stream: false` is not optional here
 *
 * Ollama streams newline-delimited JSON by default. A workflow step wants one
 * value, and the sandbox's `ctx.fetch` hands back a finished body, so this
 * always asks for the single-object form.
 *
 * ## The first call after a model is idle is slow
 *
 * A model that is not loaded is read into memory before it answers, which for a
 * large model is tens of seconds. That is `loadSeconds` in the output, and it is
 * why `keepAlive` matters: it controls how long the model stays resident after
 * this call (the server default is 5 minutes).
 *
 * ## `format`
 *
 * Blank is free text, `json` forces valid JSON, and a JSON Schema object forces
 * that shape. Ollama's own advice is to also tell the model to answer in JSON in
 * the prompt. `parsed` carries the decoded value when `format` was set.
 */
const action: ActionDefinition = {
  key: "generate",
  type: "perform",
  resource: "generation",
  title: "Generate a completion",
  description:
    "Send a prompt to a model on your Ollama server and get the full response back as one " +
    "result (non-streaming). Supports a system prompt, images for vision models, JSON or " +
    "JSON-Schema structured output, and sampling options.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "llama3.2:3b",
      hint: "A model installed on the server, `name:tag`. `model-list` shows what is there; a " +
        "missing one is a 404 until `model-pull` fetches it.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      default: "",
    },
    {
      key: "system",
      label: "System Prompt",
      type: "text",
      default: "",
      advanced: true,
      hint: "Overrides the system message the model's Modelfile defines.",
    },
    {
      key: "images",
      label: "Images",
      type: "array",
      item: { type: "string", placeholder: "base64 image data" },
      advanced: true,
      hint: "Base64-encoded images for a multimodal model. A `data:image/png;base64,` prefix " +
        "is stripped, since Ollama wants raw base64.",
    },
    {
      key: "format",
      label: "Output Format",
      type: "text",
      default: "",
      advanced: true,
      hint: "Blank for free text, `json` for any valid JSON, or a JSON Schema object such as " +
        '{"type":"object","properties":{"age":{"type":"integer"}},"required":["age"]}.',
    },
    {
      key: "think",
      label: "Thinking",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Model default" },
        { value: "true", label: "On" },
        { value: "false", label: "Off" },
        { value: "low", label: "Low effort" },
        { value: "medium", label: "Medium effort" },
        { value: "high", label: "High effort" },
      ],
      hint: "For reasoning models. The reasoning is returned separately as `thinking`. A model " +
        "that does not support it answers 400.",
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      advanced: true,
    },
    { key: "seed", label: "Seed", type: "number", advanced: true },
    {
      key: "numPredict",
      label: "Max Tokens",
      type: "number",
      advanced: true,
      hint: "Maximum tokens to generate (`num_predict`). -1 is unlimited.",
    },
    {
      key: "numCtx",
      label: "Context Window",
      type: "number",
      advanced: true,
      hint: "Tokens of context (`num_ctx`). Larger costs memory; a prompt longer than the " +
        "window is silently truncated by Ollama, not rejected.",
    },
    {
      key: "options",
      label: "Other Options",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Any other Ollama model option, e.g. {"top_k": 20, "stop": ["\\n\\n"]}. The named ' +
        "options above win over the same key here.",
    },
    {
      key: "keepAlive",
      label: "Keep Alive",
      type: "string",
      default: "",
      placeholder: "5m",
      advanced: true,
      hint: "How long the model stays loaded after this call: `10m`, `1h`, `0` to unload " +
        "now, `-1` to keep it forever. Blank uses the server default (5 minutes).",
    },
  ],
  output: [
    { key: "response", type: "string", label: "The generated text" },
    { key: "thinking", type: "string", label: "The model's reasoning, when thinking was on" },
    { key: "parsed", type: "object", label: "The response decoded as JSON, when a format was set" },
    { key: "model", type: "string", label: "The model that answered" },
    { key: "doneReason", type: "string", label: "Why it stopped: stop, length, load, unload" },
    { key: "promptTokens", type: "number", label: "Tokens in the prompt" },
    { key: "completionTokens", type: "number", label: "Tokens generated" },
    { key: "totalSeconds", type: "number", label: "Total wall time" },
    { key: "loadSeconds", type: "number", label: "Time spent loading the model" },
    { key: "context", type: "array", label: "Opaque context for continuing the conversation" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = requiredString(p.model, "model");
    const prompt = String(p.prompt ?? "");
    if (!prompt.trim()) throw new Error("`prompt` is required");
    const fmt = format(p.format);

    const r = await new OllamaClient(ctx).request<Record<string, unknown>>("/api/generate", {
      method: "POST",
      body: compact({
        model,
        prompt,
        system: optionalString(p.system),
        images: images(p.images),
        format: fmt,
        think: think(p.think),
        options: modelOptions(p),
        keep_alive: keepAlive(p.keepAlive),
        stream: false,
      }),
    });

    const response = String(r?.response ?? "");
    let parsed: unknown;
    if (fmt !== undefined) {
      try {
        parsed = JSON.parse(response);
      } catch { /* a truncated structured response is left as text */ }
    }
    return {
      response,
      thinking: r?.thinking,
      parsed,
      model: r?.model,
      doneReason: r?.done_reason,
      ...usage(r),
      context: r?.context,
    };
  },
};

export default action;
