import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, compact, json } from "../lib/client.ts";

/**
 * `POST /1/indexes/*​/queries` — verified against Algolia's OpenAPI document
 * (`search`; ACL `search`, read transporter, body requires `requests`).
 *
 * One round trip across several indices — the federated-search case, where a
 * single box searches products, articles and help pages at once. Each entry in
 * `requests` names its own `indexName` plus that query's parameters.
 */
const action: ActionDefinition = {
  key: "search-multi",
  type: "search",
  resource: "index",
  title: "Search several indices",
  description: "Run several queries, across one or many indices, in a single request.",
  params: [
    {
      key: "requests",
      label: "Requests",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"indexName":"products","query":"shoes","hitsPerPage":5}]',
      hint: "An array of query objects, each naming its own indexName.",
    },
    {
      key: "strategy",
      label: "Strategy",
      type: "select",
      default: "",
      options: [
        { value: "none", label: "None — run every query" },
        { value: "stopIfEnoughMatches", label: "Stop if enough matches" },
      ],
    },
  ],
  output: [{ key: "results", type: "array", label: "Results, in request order" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const requests = json(p.requests, "requests");
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error("`requests` is required — a non-empty array of query objects");
    }

    ctx.log("info", "searching Algolia indices", { count: requests.length });

    return await new AlgoliaClient(ctx).request("/1/indexes/*/queries", {
      method: "POST",
      body: compact({ requests, strategy: p.strategy }),
      read: true,
    });
  },
};

export default action;
