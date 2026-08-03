import type { ActionDefinition } from "@w6w/types";
import { type SearchResult, SmartsheetClient } from "../lib/client.ts";

interface Input {
  sheetId: string;
  query: string;
}

/**
 * `GET /search/sheets/{sheetId}?query=…` — search within one sheet.
 *
 * The operation declares exactly ONE query parameter, `query`. No scopes, no
 * include, no paging — so this action has no other params, because adding any
 * would be inventing surface.
 *
 * The response is the same `{ results, totalCount }` shape as the global search
 * (again: `results`, not `data`), and "The list contains an abbreviated row
 * object for each query-matching row in the sheet." Abbreviated means enough to
 * identify the row, not the full cell set — follow up with Get Row for that.
 *
 * The same index caveats apply as for the global search: a first-ever call may
 * need provisioning, and recent writes may not be discoverable yet.
 */
const searchSheet: ActionDefinition<Input, SearchResult> = {
  key: "search-sheet",
  type: "search",
  resource: "search",
  title: "Search Sheet",
  description:
    "Search within a single sheet. Returns abbreviated row objects under `results` — use Get Row " +
    "for the full cell set.",
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "Wrap in double quotes to match exact text. This endpoint takes no other parameters.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Matching rows — note: `results`, NOT `data`" },
    { key: "totalCount", type: "number", label: "Number of items in `results`" },
  ],

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request<SearchResult>(
      `/search/sheets/${encodeURIComponent(input.sheetId)}`,
      { query: { query: input.query } },
    );
  },
};

export default searchSheet;
