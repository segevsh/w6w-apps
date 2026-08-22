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
  params: [...LIST_PARAMS],

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

    return await new ReplicateClient(ctx).requestAll("/models", {}, returnAll ? Infinity : limit);
  },
};

export default action;
