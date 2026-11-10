import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /models` — verified against Replicate's OpenAPI document
 * (`models.list`).
 *
 * Every public model on Replicate, cursor-paged — which is thousands of them,
 * so **Return All here is a lot of requests**. `model-search` is almost always
 * the better question.
 */
const action: ActionDefinition = {
  key: "model-list",
  type: "read",
  resource: "model",
  title: "List models",
  description: "All public models. Search is usually the better question.",
  params: [
    {
      key: "sortBy",
      label: "Sort By",
      type: "string",
      default: "",
      advanced: true,
      hint: "`model_created_at` or `latest_version_created_at` (Replicate's default).",
    },
    {
      key: "sortDirection",
      label: "Sort Direction",
      type: "string",
      default: "",
      advanced: true,
      hint: "`asc` or `desc` (Replicate's default).",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    if (returnAll) {
      // Worth a warn: this walks the whole public catalogue.
      ctx.log("warn", "listing every public Replicate model", {});
    } else {
      ctx.log("info", "listing Replicate models", { limit });
    }

    const query = {
      sort_by: p.sortBy as string | undefined,
      sort_direction: p.sortDirection as string | undefined,
    };
    return await new ReplicateClient(ctx).requestAll(
      "/models",
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
