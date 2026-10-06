import type { ActionDefinition } from "@w6w/types";
import { resolveResource, VertexClient } from "../lib/client.ts";
import { LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/projects/{p}/locations/{l}/endpoints/{id}` — verified against the discovery
 * document (`projects.locations.endpoints.get`). Accepts a bare id or the full resource
 * name a list result carries; a full name's own location picks the host.
 */
const action: ActionDefinition = {
  key: "get-endpoint",
  type: "read",
  resource: "endpoint",
  title: "Get endpoint",
  description: "Get an endpoint, including the models deployed on it and their traffic split.",
  params: [
    PROJECT_PARAM,
    LOCATION_PARAM,
    {
      key: "endpointId",
      label: "Endpoint ID",
      type: "string",
      required: true,
      hint: "The id, or the full resource name.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "deployedModels", type: "array", label: "Deployed models" },
    { key: "trafficSplit", type: "object", label: "Traffic split" },
  ],

  async execute(input, ctx) {
    const target = resolveResource(
      ctx.connection,
      input as Record<string, unknown>,
      "endpoints",
      "endpointId",
    );
    return await new VertexClient(ctx).request(target.location, target.name);
  },
};

export default action;
