import type { ActionDefinition } from "@w6w/types";
import { GladiaClient } from "../lib/client.ts";

/**
 * `GET /v1/models` — Gladia's transcription models in OpenRouter's listing shape. Public:
 * it answers 200 without a key, so the action opts out of auth.
 */
const modelList: ActionDefinition<Record<string, never>> = {
  key: "model-list",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List Gladia's available transcription models (id, pricing, readiness).",
  requiresAuth: false,
  params: [],
  output: [{ key: "data", type: "array", label: "Models" }],

  execute(_input, ctx) {
    return new GladiaClient(ctx).json("/v1/models");
  },
};

export default modelList;
