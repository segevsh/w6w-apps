import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient, splitModel } from "../lib/client.ts";

/**
 * `GET /models/{model_owner}/{model_name}` — verified against Replicate's
 * OpenAPI document (`models.get`).
 *
 * **The reason to call this before running anything**: `latest_version.openapi_schema`
 * is the model's own input schema, and every model's is different. A prediction
 * whose `input` does not match is rejected with a schema error rather than
 * running badly, so reading the schema is how a workflow knows what to send.
 *
 * `latest_version.id` is also where a pinned version id comes from, for the
 * reproducible route.
 */
const action: ActionDefinition = {
  key: "model-get",
  type: "read",
  resource: "model",
  title: "Get a model",
  description: "One model, its current version, and the input schema a prediction must match.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "black-forest-labs/flux-schnell",
    },
  ],
  output: [
    { key: "owner", type: "string", label: "Owner" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "visibility", type: "string", label: "public or private" },
    { key: "run_count", type: "number", label: "How often it has been run" },
    {
      key: "latest_version",
      type: "object",
      label: "Current version — `id` to pin it, `openapi_schema` for its inputs",
    },
    { key: "default_example", type: "object", label: "A worked example, when the author gave one" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, name } = splitModel(p.model);

    ctx.log("info", "getting a Replicate model", { model: `${owner}/${name}` });

    return await new ReplicateClient(ctx).request(
      `/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    );
  },
};

export default action;
