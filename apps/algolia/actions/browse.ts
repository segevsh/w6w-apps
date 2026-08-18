import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, compact, csv, json } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /1/indexes/{indexName}/browse` — verified against Algolia's OpenAPI
 * document (`browse`; ACL `browse`, read transporter).
 *
 * **Not the same as search, and the difference matters.** `search` returns at
 * most 1,000 hits in total no matter how you page it; `browse` walks the whole
 * index with a `cursor`, which is what an export or a re-index reads. It also
 * ignores some ranking and pagination parameters by design.
 *
 * This action returns **one page** plus its `cursor` rather than looping to
 * exhaustion: a full index can be millions of records, and materialising that
 * into one step's output would be the wrong shape. Feed the returned `cursor`
 * back in to continue.
 */
const action: ActionDefinition = {
  key: "browse",
  type: "read",
  resource: "index",
  title: "Browse an index",
  description: "Read a page of every record in an index, for export or re-indexing.",
  params: [
    INDEX_PARAM,
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      default: "",
      hint: "The `cursor` from the previous call. Leave blank to start.",
    },
    {
      key: "hitsPerPage",
      label: "Hits Per Page",
      type: "number",
      default: 1000,
      hint: "Algolia's browse maximum is 1,000 per page.",
    },
    { key: "query", label: "Query", type: "string", default: "", hint: "Blank reads everything." },
    { key: "filters", label: "Filters", type: "string", default: "" },
    {
      key: "attributesToRetrieve",
      label: "Attributes To Retrieve",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
    { key: "extraParams", label: "Extra Parameters", type: "json", default: "" },
  ],
  output: [
    { key: "hits", type: "array", label: "Records" },
    { key: "cursor", type: "string", label: "Cursor for the next page — absent when done" },
    { key: "nbHits", type: "number", label: "Total records" },
    { key: "processingTimeMS", type: "number", label: "Processing time (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    const extra = (json(p.extraParams, "extraParams") ?? {}) as Record<string, unknown>;
    const body = {
      ...compact({
        cursor: p.cursor,
        query: p.query,
        filters: p.filters,
        hitsPerPage: typeof p.hitsPerPage === "number" ? p.hitsPerPage : undefined,
        attributesToRetrieve: csv(p.attributesToRetrieve),
      }),
      ...extra,
    };

    ctx.log("info", "browsing Algolia index", { indexName, resuming: !!p.cursor });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/browse`,
      { method: "POST", body, read: true },
    );
  },
};

export default action;
