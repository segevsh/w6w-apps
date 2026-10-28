import type { ActionDefinition } from "@w6w/types";
import { assertId, VertexClient } from "../lib/client.ts";

/**
 * `GET /v1/publishers/{publisher}/models/{model}` — verified against the
 * discovery document (`publishers.models.get`). The path is not under a
 * project or location, so it is served from the global host.
 */
const action: ActionDefinition = {
  key: "get-publisher-model",
  type: "read",
  resource: "model",
  title: "Get publisher model",
  description: "Get a Model Garden publisher model's metadata (launch stage, supported actions).",
  params: [
    { key: "publisher", label: "Publisher", type: "string", default: "google" },
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      placeholder: "gemini-2.5-flash",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "versionId", type: "string", label: "Version" },
    { key: "launchStage", type: "string", label: "Launch stage" },
    { key: "supportedActions", type: "object", label: "Supported call-to-actions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publisher = assertId(p.publisher || "google", "publisher");
    const model = assertId(p.model, "model");
    return await new VertexClient(ctx).request("global", `publishers/${publisher}/models/${model}`);
  },
};

export default action;
