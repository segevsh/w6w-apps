import type { ActionDefinition } from "@w6w/types";
import { OllamaCloudClient } from "../lib/client.ts";

interface TagModel {
  name?: string;
  model?: string;
  size?: number;
  digest?: string;
  modified_at?: string;
  details?: Record<string, unknown>;
  capabilities?: string[];
}

/**
 * `GET /api/tags` — the models this account can call on Ollama Cloud.
 *
 * "What the key can reach" is the point: model management (pulling, copying,
 * deleting, unloading) stays with the vendor — the cloud API exposes none of it —
 * so this list is the whole model surface. A model that is not here answers 404
 * from `generate`, `chat` and `embed`.
 */
const action: ActionDefinition = {
  key: "model-list",
  type: "read",
  resource: "model",
  title: "List installed models",
  description:
    "The models this Ollama Cloud account can call, with size, digest, family, parameter " +
    "size, quantization and capabilities.",
  params: [],
  output: [
    { key: "models", type: "array", label: "The models the account can call" },
    { key: "count", type: "number", label: "How many there are" },
    { key: "names", type: "array", label: "Just the model names, for a branch or a lookup" },
  ],

  async execute(_input, ctx) {
    const r = await new OllamaCloudClient(ctx).request<{ models?: TagModel[] }>("/api/tags");
    const models = (r?.models ?? []).map((m) => ({
      name: m.name ?? m.model,
      sizeBytes: m.size,
      digest: m.digest,
      modifiedAt: m.modified_at,
      family: m.details?.family,
      parameterSize: m.details?.parameter_size,
      quantization: m.details?.quantization_level,
      capabilities: m.capabilities,
      details: m.details,
    }));
    return { models, count: models.length, names: models.map((m) => m.name) };
  },
};

export default action;
