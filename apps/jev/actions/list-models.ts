import type { ActionDefinition } from "@w6w/types";
import { JevClient } from "../lib/client.ts";

/** GET /v1/models — list every Jev model available to this API key. */
const listModels: ActionDefinition<Record<string, never>> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List all Jev models available to this API key.",
  params: [],
  output: [{ key: "models", type: "array", label: "Models" }],

  execute(_input, ctx) {
    return new JevClient(ctx).request("/models");
  },
};

export default listModels;
