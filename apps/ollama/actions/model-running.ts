import type { ActionDefinition } from "@w6w/types";
import { OllamaClient } from "../lib/client.ts";

interface RunningModel {
  name?: string;
  model?: string;
  size?: number;
  size_vram?: number;
  digest?: string;
  expires_at?: string;
  context_length?: number;
  details?: Record<string, unknown>;
}

/**
 * `GET /api/ps` — the models loaded in memory right now.
 *
 * An empty list is normal: models unload after their keep-alive (5 minutes by
 * default). `sizeVramBytes` below `sizeBytes` means part of the model spilled to
 * system RAM and will run slower than a fully-GPU-resident one.
 */
const action: ActionDefinition = {
  key: "model-running",
  type: "read",
  resource: "model",
  title: "List running models",
  description:
    "The models currently loaded in memory on your Ollama server, with how much of each is in " +
    "GPU memory and when it will be unloaded. Empty is normal when nothing was used recently.",
  params: [],
  output: [
    { key: "models", type: "array", label: "The loaded models" },
    { key: "count", type: "number", label: "How many are loaded" },
  ],

  async execute(_input, ctx) {
    const r = await new OllamaClient(ctx).request<{ models?: RunningModel[] }>("/api/ps");
    const models = (r?.models ?? []).map((m) => ({
      name: m.name ?? m.model,
      sizeBytes: m.size,
      sizeVramBytes: m.size_vram,
      fullyOnGpu: m.size !== undefined && m.size_vram !== undefined
        ? m.size_vram >= m.size
        : undefined,
      expiresAt: m.expires_at,
      contextLength: m.context_length,
      digest: m.digest,
      details: m.details,
    }));
    return { models, count: models.length };
  },
};

export default action;
