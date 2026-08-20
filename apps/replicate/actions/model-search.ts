import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /search` — verified against Replicate's OpenAPI document (`search`).
 *
 * Full-text search across public models. Note it takes the query as a plain
 * `query` parameter and answers the same cursor-paged envelope as everything
 * else — so a search that finds thousands of models pages the same way a list
 * does.
 */
const action: ActionDefinition = {
  key: "model-search",
  type: "read",
  resource: "model",
  title: "Search models",
  description: "Find public models by name or description.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      default: "",
      placeholder: "image upscaling",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const query = String(p.query ?? "").trim();
    if (!query) throw new Error("`query` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "searching Replicate models", { returnAll, limit });

    return await new ReplicateClient(ctx).requestAll(
      "/search",
      { query: { query } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
