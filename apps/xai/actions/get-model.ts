import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

interface Input {
  modelId: string;
}

/** GET /v1/models/{model_id}. */
const getModel: ActionDefinition<Input> = {
  key: "get-model",
  type: "read",
  resource: "model",
  title: "Get Model",
  description: "Get one model with its pricing (GET /v1/models/{model_id}).",
  params: [{ key: "modelId", label: "Model ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Model id" },
    { key: "aliases", type: "array", label: "Aliases" },
  ],

  execute(input, ctx) {
    return new XaiClient(ctx).request(`/v1/models/${encodeURIComponent(input.modelId)}`);
  },
};

export default getModel;
