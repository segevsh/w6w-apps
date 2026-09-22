import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";
import { SEARCH_VIEW_OPTIONS, searchPageParams, searchQueryParam } from "../lib/params.ts";

/**
 * `POST /search` — the only way to list most of this API.
 *
 * Companies, jobs, logged time, logged expenses, quotes and invoices have **no
 * list endpoint**: each is readable one id at a time, and ids come from here.
 * The `search_view` query parameter picks what is being searched, and the body
 * carries the filter, sort and paging.
 *
 * ## Fetch the setup first
 *
 * Streamtime's own description is emphatic about this: "You need the information
 * from `getSearchSetup` to construct a search request accurately, so ensure you
 * have it before calling this route. `getSearchSetup` results are stable for the
 * duration of a session … so fetch it once and reuse it for subsequent searches
 * rather than re-fetching before every call." The `query` hint below reproduces
 * the filter language verbatim; the selectors themselves (and the valid sort
 * columns and `additionalData` keys) come from `search-setup-get`.
 *
 * ## Limits
 *
 * `limit` defaults to 1000 — also its documented maximum, above which the
 * request errors — so 100 is prefilled here. `offset` pages through larger
 * result sets. The vendor's own advice is to prefer `report-run` when only
 * aggregates are wanted, rather than pulling every record back.
 */
interface Input {
  searchView: string;
  query: string;
  limit?: number;
  offset?: number;
  sortColumn?: string;
  sortAscending?: boolean;
  additionalData?: string[];
}

const searchRecords: ActionDefinition<Input, { records: unknown[] }> = {
  key: "search-records",
  type: "search",
  resource: "search",
  title: "Search Records",
  description:
    "Run a filtered search over one of Streamtime's 24 search views. The only way to list jobs, " +
    "companies, contacts, quotes, invoices, logged time, logged expenses and users.",
  params: [
    {
      key: "searchView",
      label: "Search View",
      type: "select",
      required: true,
      options: SEARCH_VIEW_OPTIONS,
      hint: "What do you want to search for? Streamtime's own words for it.",
    },
    searchQueryParam,
    ...searchPageParams(),
    {
      key: "sortColumn",
      label: "Sort Column",
      type: "string",
      advanced: true,
      hint: "One of the `sortColumns` returned by Search Setup. Omit for the vendor's default.",
    },
    {
      key: "sortAscending",
      label: "Ascending",
      type: "boolean",
      advanced: true,
      hint: "Sort direction for the sort column. Streamtime defaults to true.",
    },
    {
      key: "additionalData",
      label: "Additional Data",
      type: "array",
      item: { type: "string", placeholder: "e.g. company" },
      advanced: true,
      hint: "Related data to include per record (e.g. company, contact). Take the keys from " +
        "`additionalData` in Search Setup.",
    },
  ],
  output: [
    {
      key: "records",
      type: "array",
      label: "Matching records — the fields depend on the view, plus any additionalData",
    },
  ],

  async execute(input, ctx) {
    const records = await new StreamtimeClient(ctx).request<unknown[]>("/search", {
      method: "POST",
      query: { search_view: input.searchView },
      body: {
        query: input.query,
        limit: input.limit,
        offset: input.offset,
        sortColumn: input.sortColumn,
        sortAscending: input.sortAscending,
        additionalData: input.additionalData,
      },
    });
    return { records: records ?? [] };
  },
};

export default searchRecords;
