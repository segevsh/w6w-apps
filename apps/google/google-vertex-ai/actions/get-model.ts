import type { ActionDefinition } from "@w6w/types";
import { resolveResource, VertexClient } from "../lib/client.ts";
import { LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/projects/{p}/locations/{l}/models/{id}` — verified against the discovery
 * document (`projects.locations.models.get`). Accepts a bare id or the full resource
 * name a list result carries; a full name's own location picks the host.
 */
const action: ActionDefinition = {
  key: "get-model",
  type: "read",
  resource: "model",
  title: "Get model",
  description: "Get a Model Registry model's metadata and deployed-model links.",
  params: [
    PROJECT_PARAM,
    LOCATION_PARAM,
    {
      key: "modelId",
      label: "Model ID",
      type: "string",
      required: true,
      hint: "The id, or the full resource name.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "deployedModels", type: "array", label: "Deployed models" },
  ],

  async execute(input, ctx) {
    const target = resolveResource(
      ctx.connection,
      input as Record<string, unknown>,
      "models",
      "modelId",
    );
    return await new VertexClient(ctx).request(target.location, target.name);
  },
};

export default action;
