import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient, splitModel } from "../lib/client.ts";

/**
 * `GET /models/{model_owner}/{model_name}/versions/{version_id}` — verified
 * against Replicate's OpenAPI document (`models.versions.get`).
 *
 * The version's **`openapi_schema`** is the point: it describes exactly what
 * `input` this version accepts, including which fields are required and what
 * their defaults are. Two versions of the same model can take different inputs,
 * which is why pinning a version and reading its schema go together.
 */
const action: ActionDefinition = {
  key: "model-version-get",
  type: "read",
  resource: "model",
  title: "Get a model version",
  description: "One version and its input schema — what a prediction on it must send.",
  params: [
    { key: "model", label: "Model", type: "string", required: true, default: "" },
    { key: "versionId", label: "Version ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Version id — what Run a Model Version takes" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "cog_version", type: "string", label: "Cog version" },
    { key: "openapi_schema", type: "object", label: "This version's input and output schema" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, name } = splitModel(p.model);
    const versionId = String(p.versionId ?? "").trim();
    if (!versionId) throw new Error("`versionId` is required");

    ctx.log("info", "getting a Replicate model version", { model: `${owner}/${name}` });

    return await new ReplicateClient(ctx).request(
      `/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/versions/${
        encodeURIComponent(versionId)
      }`,
    );
  },
};

export default action;
