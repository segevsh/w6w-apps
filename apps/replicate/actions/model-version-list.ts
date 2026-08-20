import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient, splitModel } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /models/{model_owner}/{model_name}/versions` — verified against
 * Replicate's OpenAPI document (`models.versions.list`).
 *
 * Where a pinned version id comes from when you want an older one. **Official
 * models have no versions** — they are run by name only — so this answers an
 * empty list for them rather than failing, which is worth knowing before
 * building a pinning workflow around it.
 */
const action: ActionDefinition = {
  key: "model-version-list",
  type: "read",
  resource: "model",
  title: "List a model's versions",
  description: "A model's versions, newest first. Official models have none.",
  params: [
    { key: "model", label: "Model", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, name } = splitModel(p.model);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Replicate model versions", { model: `${owner}/${name}` });

    return await new ReplicateClient(ctx).requestAll(
      `/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/versions`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
