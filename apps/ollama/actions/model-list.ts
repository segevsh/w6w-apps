import type { ActionDefinition } from "@w6w/types";
import { OllamaClient } from "../lib/client.ts";

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
 * `GET /api/tags` — the models installed on this server.
 *
 * "Installed" is the point: this is what is on disk, not what is in memory
 * (that is `model-running`). A model must be listed here before `generate`,
 * `chat` or `embed` can use it; anything else is a 404 until `model-pull`.
 * `sizeBytes` is the size on disk.
 */
const action: ActionDefinition = {
  key: "model-list",
  type: "read",
  resource: "model",
  title: "List installed models",
  description:
    "The models installed on your Ollama server (what is on disk, not what is loaded in " +
    "memory), with size, digest, family, parameter size, quantization and capabilities.",
  params: [],
  output: [
    { key: "models", type: "array", label: "The installed models" },
    { key: "count", type: "number", label: "How many are installed" },
    { key: "names", type: "array", label: "Just the model names, for a branch or a lookup" },
  ],

  async execute(_input, ctx) {
    const r = await new OllamaClient(ctx).request<{ models?: TagModel[] }>("/api/tags");
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
