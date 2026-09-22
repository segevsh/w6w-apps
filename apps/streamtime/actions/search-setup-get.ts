import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";
import { SEARCH_VIEW_OPTIONS } from "../lib/params.ts";

/**
 * `GET /search/setup` — what you may put in a `POST /search` request.
 *
 * The document tells callers to fetch this before searching, and that its
 * results are "stable for the duration of a session (they only change when a new
 * product release ships)" — so it is worth caching across the searches in a
 * workflow rather than re-fetching before each one.
 *
 * The body is a documented object with three arrays:
 *
 *  - `filters` — `{ selector, name, description, filterType }`, where `selector`
 *    is the identifier the query language uses and `filterType` is the kind of
 *    value it compares against;
 *  - `additionalData` — the related objects a search may ask to include;
 *  - `sortColumns` — the columns the results may be sorted by.
 */
interface Input {
  searchView: string;
}

const searchSetupGet: ActionDefinition<Input> = {
  key: "search-setup-get",
  type: "read",
  resource: "search",
  title: "Get Search Setup",
  description:
    "Fetch the filters, additional data and sort columns available for one search view. " +
    "Streamtime advises fetching this once and reusing it.",
  params: [
    {
      key: "searchView",
      label: "Search View",
      type: "select",
      required: true,
      options: SEARCH_VIEW_OPTIONS,
    },
  ],
  output: [
    {
      key: "filters",
      type: "array",
      label: "Available filters — `{ selector, name, description, filterType }`",
    },
    { key: "additionalData", type: "array", label: "Related data that can be requested" },
    { key: "sortColumns", type: "array", label: "Columns results can be sorted by" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request("/search/setup", {
      query: { search_view: input.searchView },
    });
  },
};

export default searchSetupGet;
