import type { ActionDefinition } from "@w6w/types";
import { compact, json, resolvePublisherModel, VertexClient } from "../lib/client.ts";
import { modelParams } from "../lib/publisher.ts";

/**
 * `POST …/publishers/{publisher}/models/{m}:predict` — verified against the
 * discovery document (`projects.locations.publishers.models.predict`). The
 * request is `{ instances, parameters }` and the response `{ predictions,
 * metadata, … }`. The shape of one instance belongs to the model, not to the
 * API, so `instances` passes through verbatim — for the `text-embedding-*`
 * models that is `[{ "content": "text to embed" }]`.
 */
const action: ActionDefinition = {
  key: "predict-publisher-model",
  type: "perform",
  resource: "prediction",
  title: "Predict (publisher model)",
  description:
    "Call a publisher model's `predict` method — text-embedding models, Imagen and other non-Gemini models.",
  // A read-only embedding call is repeatable, but Imagen and similar models
  // generate (and bill) a new result each time, so retry is not assumed safe.
  idempotent: false,
  params: [
    ...modelParams("text-embedding-005"),
    {
      key: "instances",
      label: "Instances",
      type: "json",
      required: true,
      hint:
        'Array of model-specific inputs, e.g. [{ "content": "hello world" }] for text embeddings.',
    },
    {
      key: "parameters",
      label: "Parameters",
      type: "json",
      hint: 'Model-specific parameters, e.g. { "outputDimensionality": 256 }.',
    },
  ],
  output: [
    { key: "predictions", type: "array", label: "Predictions" },
    { key: "metadata", type: "object", label: "Metadata" },
    { key: "modelDisplayName", type: "string", label: "Model display name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const target = resolvePublisherModel(ctx.connection, p);
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
