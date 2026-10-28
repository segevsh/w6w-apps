import type { ActionDefinition } from "@w6w/types";
import { compact, json, resolvePublisherModel, VertexClient } from "../lib/client.ts";
import { modelParams } from "../lib/publisher.ts";

/**
 * `POST …/publishers/google/models/{m}:countTokens` — verified against the
 * discovery document (`projects.locations.publishers.models.countTokens`).
 * Counting is free and does not generate anything, so it is a safe pre-flight
 * for a prompt that might not fit.
 */
const action: ActionDefinition = {
  key: "count-tokens",
  type: "read",
  resource: "content",
  title: "Count tokens",
  description: "Count the tokens a prompt would use on a Vertex AI publisher model.",
  params: [
    ...modelParams("gemini-2.5-flash"),
    {
      key: "contents",
      label: "Contents",
      type: "json",
      required: true,
      hint: "Array of `{ role, parts: [{ text }] }`.",
    },
    { key: "systemInstruction", label: "System instruction", type: "text" },
    { key: "tools", label: "Tools", type: "json" },
  ],
  output: [
    { key: "totalTokens", type: "number", label: "Total tokens" },
    { key: "totalBillableCharacters", type: "number", label: "Billable characters" },
    { key: "promptTokensDetails", type: "array", label: "Tokens per modality" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const target = resolvePublisherModel(ctx.connection, p);
    const system = String(p.systemInstruction ?? "");
    const body = compact({
      contents: json(p.contents, "contents"),
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      tools: json(p.tools, "tools"),
    });
    if (!body.contents) throw new Error("`contents` is required");
    return await new VertexClient(ctx).request(target.location, `${target.name}:countTokens`, {
      method: "POST",
      body,
    });
  },
};

export default action;
