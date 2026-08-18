import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient } from "../lib/client.ts";

/**
 * `GET /1/indexes` — verified against Algolia's OpenAPI document
 * (`listIndices`; ACL `listIndexes`). Answers `{ items, nbPages }`.
 *
 * Note the ACL: a search-only key cannot call this. That is why the auth
 * `test` hook probes the key itself rather than this endpoint.
 */
const action: ActionDefinition = {
  key: "index-list",
  type: "read",
  resource: "index",
  title: "List indices",
  description: "List the indices on this application, with their record counts and sizes.",
  params: [
    { key: "page", label: "Page", type: "number", default: null, hint: "Zero-based." },
    { key: "hitsPerPage", label: "Per Page", type: "number", default: 100 },
  ],
  output: [
    { key: "items", type: "array", label: "Indices" },
    { key: "nbPages", type: "number", label: "Pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    ctx.log("info", "listing Algolia indices");

    return await new AlgoliaClient(ctx).request("/1/indexes", {
      read: true,
      query: {
        page: typeof p.page === "number" ? p.page : undefined,
        hitsPerPage: typeof p.hitsPerPage === "number" ? p.hitsPerPage : undefined,
      },
    });
  },
};

export default action;
