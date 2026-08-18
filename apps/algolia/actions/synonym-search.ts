import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, compact } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/synonyms/search` — verified against Algolia's
 * OpenAPI document (`searchSynonyms`; ACL `settings`).
 *
 * Searching is how you **list** synonyms: an empty query returns them all.
 * There is no plain GET collection for synonyms.
 */
const action: ActionDefinition = {
  key: "synonym-search",
  type: "search",
  resource: "synonym",
  title: "Search synonyms",
  description: "List or search an index's synonyms. An empty query returns all of them.",
  params: [
    INDEX_PARAM,
    { key: "query", label: "Query", type: "string", default: "", hint: "Blank returns all." },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "synonym", label: "Synonym" },
        { value: "onewaysynonym", label: "One-way synonym" },
        { value: "altcorrection1", label: "Alt correction 1" },
        { value: "altcorrection2", label: "Alt correction 2" },
        { value: "placeholder", label: "Placeholder" },
      ],
    },
    { key: "page", label: "Page", type: "number", default: null, hint: "Zero-based." },
    { key: "hitsPerPage", label: "Per Page", type: "number", default: 100 },
  ],
  output: [
    { key: "hits", type: "array", label: "Synonyms" },
    { key: "nbHits", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    const body = compact({
      query: p.query,
      type: p.type,
      page: typeof p.page === "number" ? p.page : undefined,
      hitsPerPage: typeof p.hitsPerPage === "number" ? p.hitsPerPage : undefined,
    });

    ctx.log("info", "searching Algolia synonyms", { indexName });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/search`,
      { method: "POST", body, read: true },
    );
  },
};

export default action;
