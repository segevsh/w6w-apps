import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

/** GET /v1/models — ids, creation times and pricing. The source for current model ids. */
const listModels: ActionDefinition<Record<string, never>> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List all models available to this API key, with pricing (GET /v1/models).",
  params: [],
  output: [{ key: "data", type: "array", label: "Models" }],

  execute(_input, ctx) {
    return new XaiClient(ctx).request("/v1/models");
  },
};

export default listModels;
