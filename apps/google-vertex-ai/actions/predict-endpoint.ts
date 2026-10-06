import type { ActionDefinition } from "@w6w/types";
import { compact, json, resolveResource, VertexClient } from "../lib/client.ts";
import { LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/projects/{p}/locations/{l}/endpoints/{id}:predict` — verified against
 * the discovery document (`projects.locations.endpoints.predict`). Request
 * `{ instances, parameters }`, response `{ predictions, deployedModelId, model,
 * modelDisplayName, modelVersionId, metadata }`. The instance shape is defined
 * by the deployed model, so it passes through.
 *
 * Dedicated-DNS endpoints (`dedicatedEndpointEnabled`) are called on their own
 * `{id}.{region}-….prediction.vertexai.goog` host, which this app does not
 * reach; use a shared endpoint.
 */
const action: ActionDefinition = {
  key: "predict-endpoint",
  type: "perform",
  resource: "prediction",
  title: "Predict (deployed endpoint)",
  description: "Send instances to a model deployed on a Vertex AI endpoint and get predictions.",
  // Depends on the deployed model; a retry may be a second billed inference.
  idempotent: false,
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
    {
      key: "instances",
      label: "Instances",
      type: "json",
      required: true,
      hint: "Array of inputs in the shape the deployed model expects.",
    },
    { key: "parameters", label: "Parameters", type: "json" },
  ],
  output: [
    { key: "predictions", type: "array", label: "Predictions" },
    { key: "deployedModelId", type: "string", label: "Deployed model ID" },
    { key: "modelDisplayName", type: "string", label: "Model display name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const target = resolveResource(ctx.connection, p, "endpoints", "endpointId");
    const instances = json(p.instances, "instances");
    if (!Array.isArray(instances) || instances.length === 0) {
      throw new Error("`instances` must be a non-empty array");
    }
    return await new VertexClient(ctx).request(target.location, `${target.name}:predict`, {
      method: "POST",
      body: compact({ instances, parameters: json(p.parameters, "parameters") }),
    });
  },
};

export default action;
