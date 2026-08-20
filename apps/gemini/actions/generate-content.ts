import type { ActionDefinition } from "@w6w/types";
import { GeminiClient, modelResource } from "../lib/client.ts";

interface Input {
  model: string;
  contents: unknown;
  systemInstruction?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
  stopSequences?: string[];
  responseMimeType?: "text/plain" | "application/json";
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  responseSchema?: unknown;
  safetySettings?: unknown;
  tools?: unknown;
  toolConfig?: unknown;
}

/**
 * `generateContent` — the core Gemini call. `contents` mirrors the API's own
 * shape verbatim (`Content[]`, each `{ role, parts: [{ text }, …] }`) rather
 * than flattening to a single string, so multi-turn history and multimodal
 * `parts` (inline images, function results, …) pass through unchanged.
 *
 * Streaming (`streamGenerateContent`) is deliberately not offered: `ctx.fetch`
 * returns a single `Response` the runtime reads to completion, and there is no
 * hook surface in this pack for handing a caller an incremental stream.
 */
const generateContent: ActionDefinition<Input> = {
  key: "generate-content",
  type: "perform",
  resource: "content",
  title: "Generate Content",
  description: "Generate a model response from text, chat history, or multimodal content.",
  // Generation is sampled, not deterministic — the same request returns different
  // text on every call (and bills for each), so a retry is a new result, never a
  // replay of the previous one. `temperature: 0` narrows the distribution but the
  // API documents no idempotency key and makes no repeatability guarantee.
  idempotent: false,
  params: [
    { key: "model", label: "Model", type: "string", required: true, default: "gemini-3.5-flash" },
    {
      key: "contents",
      label: "Contents",
      type: "json",
      required: true,
      hint: 'Array of `{ role, parts: [{ text }] }`. `role` is "user" or "model".',
    },
    {
      key: "systemInstruction",
      label: "System instruction",
      type: "text",
      hint: "Plain text; sent as a single text part with no role.",
    },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    { key: "topK", label: "Top K", type: "number" },
    { key: "maxOutputTokens", label: "Max output tokens", type: "number" },
    { key: "candidateCount", label: "Candidate count", type: "number" },
    { key: "stopSequences", label: "Stop sequences", type: "string", repeat: true },
    {
      key: "responseMimeType",
      label: "Response MIME type",
      type: "select",
      options: [
        { value: "text/plain", label: "Text" },
        { value: "application/json", label: "JSON" },
      ],
    },
    { key: "presencePenalty", label: "Presence penalty", type: "number" },
    { key: "frequencyPenalty", label: "Frequency penalty", type: "number" },
    { key: "seed", label: "Seed", type: "number" },
    {
      key: "responseSchema",
      label: "Response schema",
      type: "json",
      showIf: { field: "responseMimeType", equals: "application/json" },
      hint:
        "OpenAPI-subset schema the JSON reply must satisfy. Gemini only honours this alongside " +
        "a JSON response MIME type, which is why it is bound to that choice.",
    },
    {
      // Function calling — the feature that turns a generation into an agent
      // step. Anthropic's `message-create` in this same pack has carried its
      // equivalent from the start; Gemini's shape is its own, so it stays
      // `json` rather than being modelled into a form.
      key: "tools",
      label: "Tools",
      type: "json",
      hint:
        'Array of tool declarations, e.g. [{ "functionDeclarations": [{ "name": "get_weather", "parameters": { … } }] }]. ' +
        "Also where the built-in `googleSearch` / `codeExecution` tools are enabled. " +
        "A calling model answers with a `functionCall` part instead of text.",
    },
    {
      key: "toolConfig",
      label: "Tool config",
      type: "json",
      hint:
        'Controls when the model may call: { "functionCallingConfig": { "mode": "AUTO" | "ANY" | "NONE", "allowedFunctionNames": [ … ] } }',
    },
    {
      key: "safetySettings",
      label: "Safety settings",
      type: "json",
      hint:
        "Array of `{ category, threshold }`, e.g. `HARM_CATEGORY_HARASSMENT` / `BLOCK_ONLY_HIGH`.",
    },
  ],
  output: [
    { key: "candidates", type: "array", label: "Candidates" },
    { key: "usageMetadata", type: "object", label: "Token usage" },
    { key: "promptFeedback", type: "object", label: "Prompt feedback" },
  ],

  execute(input, ctx) {
    const client = new GeminiClient(ctx);
    const generationConfig: Record<string, unknown> = {};
    if (input.temperature !== undefined) generationConfig.temperature = input.temperature;
    if (input.topP !== undefined) generationConfig.topP = input.topP;
    if (input.topK !== undefined) generationConfig.topK = input.topK;
    if (input.maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = input.maxOutputTokens;
    }
    if (input.candidateCount !== undefined) generationConfig.candidateCount = input.candidateCount;
    if (input.stopSequences?.length) generationConfig.stopSequences = input.stopSequences;
    if (input.responseMimeType) generationConfig.responseMimeType = input.responseMimeType;
    if (input.presencePenalty !== undefined) {
      generationConfig.presencePenalty = input.presencePenalty;
    }
    if (input.frequencyPenalty !== undefined) {
      generationConfig.frequencyPenalty = input.frequencyPenalty;
    }
    if (input.seed !== undefined) generationConfig.seed = input.seed;
    // Gemini ignores `responseSchema` unless the reply is JSON, so a schema set
    // against a text response is a silent no-op — say so rather than send it.
    if (input.responseSchema !== undefined) {
      if (input.responseMimeType !== "application/json") {
        throw new Error(
          "`responseSchema` only applies when Response MIME type is `application/json` — " +
            "Gemini ignores it otherwise.",
        );
      }
      generationConfig.responseSchema = input.responseSchema;
    }

    const body: Record<string, unknown> = { contents: input.contents };
    if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;
    if (input.systemInstruction) {
      body.systemInstruction = { parts: [{ text: input.systemInstruction }] };
    }
    if (input.safetySettings !== undefined) body.safetySettings = input.safetySettings;
    if (input.tools !== undefined) body.tools = input.tools;
    if (input.toolConfig !== undefined) body.toolConfig = input.toolConfig;

    return client.request(`/${modelResource(input.model)}:generateContent`, {
      method: "POST",
      body,
    });
  },
};

export default generateContent;
