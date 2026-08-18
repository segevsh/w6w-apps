import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, compact } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/rules/search` — verified against Algolia's
 * OpenAPI document (`searchRules`; ACL `settings`).
 *
 * As with synonyms, searching is how you list: an empty query returns every
 * rule.
 */
const action: ActionDefinition = {
  key: "rule-search",
  type: "search",
  resource: "rule",
  title: "Search rules",
  description: "List or search an index's query rules. An empty query returns all of them.",
  params: [
    INDEX_PARAM,
    { key: "query", label: "Query", type: "string", default: "", hint: "Blank returns all." },
    {
      key: "context",
      label: "Context",
      type: "string",
      default: "",
      hint: "Only rules carrying this context.",
    },
    {
      key: "enabled",
      label: "Enabled Only",
      type: "boolean",
      default: null,
      hint: "Leave unset for both enabled and disabled rules.",
    },
    { key: "page", label: "Page", type: "number", default: null, hint: "Zero-based." },
    { key: "hitsPerPage", label: "Per Page", type: "number", default: 100 },
  ],
  output: [
    { key: "hits", type: "array", label: "Rules" },
    { key: "nbHits", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    const body = compact({
      query: p.query,
      context: p.context,
      // Both true and false are meaningful; only "unset" is dropped.
      enabled: typeof p.enabled === "boolean" ? p.enabled : undefined,
      page: typeof p.page === "number" ? p.page : undefined,
      hitsPerPage: typeof p.hitsPerPage === "number" ? p.hitsPerPage : undefined,
    });

    ctx.log("info", "searching Algolia rules", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/search`,
      { method: "POST", body, read: true },
    );
  },
};

export default action;
