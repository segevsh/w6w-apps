import type { ActionDefinition } from "@w6w/types";
import { compact, json, resolvePublisherModel, VertexClient } from "../lib/client.ts";
import { modelParams } from "../lib/publisher.ts";

interface Part {
  text?: string;
  thought?: boolean;
}
interface Candidate {
  content?: { parts?: Part[] };
}

/**
 * `POST /v1/projects/{p}/locations/{l}/publishers/google/models/{m}:generateContent`
 * — verified against the discovery document (`projects.locations.publishers.models.generateContent`).
 *
 * This is the Vertex AI surface — Cloud project, IAM and regional quota —
 * not the API-key Gemini Developer API the `gemini` app calls. The request body
 * is the same shape, so `contents` passes through verbatim.
 */
const action: ActionDefinition = {
  key: "generate-content",
  type: "perform",
  resource: "content",
  title: "Generate content",
  description:
    "Generate a Gemini response on Vertex AI from text, chat history or multimodal parts.",
  // Sampled, billed per call, and the API documents no idempotency key.
  idempotent: false,
  params: [
    ...modelParams("gemini-2.5-flash"),
    {
      key: "contents",
      label: "Contents",
      type: "json",
      required: true,
      hint: 'Array of `{ role, parts: [{ text }] }`. `role` is "user" or "model".',
    },
    { key: "systemInstruction", label: "System instruction", type: "text" },
    { key: "temperature", label: "Temperature", type: "number" },
    { key: "topP", label: "Top P", type: "number" },
    { key: "topK", label: "Top K", type: "number" },
    { key: "maxOutputTokens", label: "Max output tokens", type: "number" },
    { key: "candidateCount", label: "Candidate count", type: "number" },
    { key: "stopSequences", label: "Stop sequences", type: "string", repeat: true },
    { key: "seed", label: "Seed", type: "number" },
    {
      key: "responseMimeType",
      label: "Response MIME type",
      type: "select",
      options: [
        { value: "text/plain", label: "Text" },
        { value: "application/json", label: "JSON" },
      ],
    },
    {
      key: "responseSchema",
      label: "Response schema",
      type: "json",
      showIf: { field: "responseMimeType", equals: "application/json" },
      hint: "OpenAPI-subset schema the JSON reply must satisfy.",
    },
    {
      key: "tools",
      label: "Tools",
      type: "json",
      hint: 'e.g. [{ "functionDeclarations": [{ "name": "get_weather", "parameters": { … } }] }]',
    },
    { key: "toolConfig", label: "Tool config", type: "json" },
    {
      key: "safetySettings",
      label: "Safety settings",
      type: "json",
      hint: "Array of `{ category, threshold }`.",
    },
  ],
  output: [
    { key: "text", type: "string", label: "Text of the first candidate (thought parts excluded)" },
    { key: "candidates", type: "array", label: "Candidates" },
    { key: "usageMetadata", type: "object", label: "Token usage" },
    { key: "promptFeedback", type: "object", label: "Prompt feedback" },
    { key: "modelVersion", type: "string", label: "Model version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const target = resolvePublisherModel(ctx.connection, p);

    if (
      p.responseSchema !== undefined && p.responseSchema !== "" &&
      p.responseMimeType !== "application/json"
    ) {
      throw new Error(
        "`responseSchema` only applies when Response MIME type is `application/json`",
      );
    }
    const generationConfig = compact({
      temperature: p.temperature,
      topP: p.topP,
      topK: p.topK,
      maxOutputTokens: p.maxOutputTokens,
      candidateCount: p.candidateCount,
      stopSequences: p.stopSequences,
      seed: p.seed,
      responseMimeType: p.responseMimeType,
      responseSchema: json(p.responseSchema, "responseSchema"),
    });
    const system = String(p.systemInstruction ?? "");
    const body = compact({
      contents: json(p.contents, "contents"),
      generationConfig: Object.keys(generationConfig).length ? generationConfig : undefined,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      safetySettings: json(p.safetySettings, "safetySettings"),
      tools: json(p.tools, "tools"),
      toolConfig: json(p.toolConfig, "toolConfig"),
    });
    if (!body.contents) throw new Error("`contents` is required");

    ctx.log("info", "generating content on Vertex AI", { model: target.name });
    const res = await new VertexClient(ctx).request<Record<string, unknown>>(
      target.location,
      `${target.name}:generateContent`,
      { method: "POST", body },
    );
    const first = (res?.candidates as Candidate[] | undefined)?.[0];
    const text = (first?.content?.parts ?? [])
      .filter((part) => typeof part.text === "string" && part.thought !== true)
      .map((part) => part.text)
      .join("");
    return { text, ...res };
  },
};

export default action;
