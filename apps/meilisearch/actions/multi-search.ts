import type { ActionDefinition } from "@w6w/types";
import { json, MeilisearchClient } from "../lib/client.ts";

/**
 * `POST /multi-search` — verified against Meilisearch's OpenAPI document
 * (`multi_search_with_post`).
 *
 * One request, several indexes, one round trip. This is what a federated
 * search box uses, and it is meaningfully different from calling `search`
 * repeatedly: the queries run together and the results come back in one
 * envelope keyed by index.
 *
 * Each query carries its own `indexUid`, so there is no connection default to
 * fall back on — the queries are passed as JSON rather than fanned out from a
 * form, because inventing a shape on top would make the per-query parameters
 * unreachable.
 */
const action: ActionDefinition = {
  key: "multi-search",
  type: "read",
  resource: "document",
  title: "Search several indexes",
  description: "Run several searches across indexes in one request.",
  params: [
    {
      key: "queries",
      label: "Queries",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"indexUid":"movies","q":"dune","limit":5},' +
        '{"indexUid":"books","q":"dune","limit":5}]',
      hint: "An array of search objects, each with its own `indexUid`.",
    },
    {
      key: "federation",
      label: "Federation",
      type: "json",
      default: "",
      placeholder: '{"limit":20,"offset":0}',
      hint: "Set this to merge the results into one ranked list instead of one list per query.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "One result set per query, unless federated" },
    { key: "hits", type: "array", label: "The merged list, when federation is set" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const queries = json(p.queries, "queries");
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new Error("`queries` is required — a non-empty array of search objects");
    }
    for (const [i, q] of queries.entries()) {
      const uid = (q as Record<string, unknown>)?.indexUid;
      if (!uid || typeof uid !== "string") {
        throw new Error(`query ${i} has no \`indexUid\` — each query names its own index`);
      }
    }

    const federation = json(p.federation, "federation");
    ctx.log("info", "running a Meilisearch multi-search", {
      queries: queries.length,
      federated: federation !== undefined,
    });

    return await new MeilisearchClient(ctx).request("/multi-search", {
      method: "POST",
      body: federation === undefined ? { queries } : { queries, federation },
    });
  },
};

export default action;
