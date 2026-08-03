import type { ActionDefinition } from "@w6w/types";
import { csv, type SearchResult, SmartsheetClient } from "../lib/client.ts";

interface Input {
  query: string;
  scopes?: string[];
  include?: string[];
  modifiedSince?: string;
}

/**
 * `GET /search?query=…` — search everything the user can access.
 *
 * ## The envelope is `results`, not `data`
 *
 * Every paginated collection in this API returns `{ data, totalCount, … }`.
 * Search does not: `SearchResult` is `{ results, totalCount }`. A downstream step
 * that reads `data` off this action gets `undefined`, silently, forever — which
 * is why this is called out in the output labels as well as here.
 *
 * Search is also NOT paginated. The operation declares no `page`, `pageSize` or
 * `includeAll`; `totalCount` is documented as "Total number of search results in
 * the `results` array", so it describes what was returned rather than a larger
 * set to walk.
 *
 * ## Two caveats Smartsheet states itself
 *
 *   - "If you haven't used the public API in a while, we will need to provision
 *     your data. This could take up to 24 hours" — a first-ever search can come
 *     back empty for reasons that have nothing to do with the query.
 *   - "Newly created or recently updated data may not be immediately
 *     discoverable via search." Search is an index, not a read-your-writes view;
 *     do not chain it directly after a write and expect the new row.
 *
 * `location=personalWorkspace` is deliberately not exposed: the spec marks it
 * **Deprecated**.
 */
const search: ActionDefinition<Input, SearchResult> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description:
    "Search every sheet the connected user can access. Returns `results` (not `data`), and is " +
    "index-backed — recent writes may not be discoverable yet.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: 'Wrap in double quotes to match exact text, e.g. `"Q3 budget"`.',
    },
    {
      key: "scopes",
      label: "Scopes",
      type: "multiselect",
      options: [
        { value: "attachments", label: "attachments" },
        { value: "cellData", label: "cellData" },
        { value: "comments", label: "comments" },
        { value: "folderNames", label: "folderNames" },
        { value: "reportNames", label: "reportNames" },
        { value: "sheetNames", label: "sheetNames" },
        { value: "sightNames", label: "sightNames (dashboards)" },
        { value: "summaryFields", label: "summaryFields" },
        { value: "templateNames", label: "templateNames" },
        { value: "workspaceNames", label: "workspaceNames" },
      ],
      hint: "Narrow what is searched. Omit to search everything.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "favoriteFlag", label: "favoriteFlag — mark results that are favourites" },
      ],
    },
    {
      key: "modifiedSince",
      label: "Modified since",
      type: "datetime",
      hint: "ISO-8601. Only objects modified on or after this instant.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Matching items — note: `results`, NOT `data`" },
    { key: "totalCount", type: "number", label: "Number of items in `results`" },
  ],

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request<SearchResult>("/search", {
      query: {
        query: input.query,
        scopes: csv(input.scopes),
        include: csv(input.include),
        modifiedSince: input.modifiedSince,
      },
    });
  },
};

export default search;
