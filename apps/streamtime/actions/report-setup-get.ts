import type { ActionDefinition } from "@w6w/types";
import { StreamtimeClient } from "../lib/client.ts";
import { REPORT_VIEW_OPTIONS } from "../lib/params.ts";

/**
 * `GET /report/setup` — what you may put in a `POST /report` request.
 *
 * A different view list from search: 12 views, no `*_line_items` and no
 * `job_group_periods`. The body carries the three things a report needs:
 *
 *  - `groupingOptions` — the dimensions a report may be grouped by;
 *  - `statistics` — the columns that may be aggregated;
 *  - `filters` — the same `{ selector, name, description, filterType }` rows as
 *    the search route, because a report takes a query too.
 */
interface Input {
  searchView: string;
}

const reportSetupGet: ActionDefinition<Input> = {
  key: "report-setup-get",
  type: "read",
  resource: "report",
  title: "Get Report Setup",
  description:
    "Fetch the grouping options, statistics columns and filters available for one report view.",
  params: [
    {
      key: "searchView",
      label: "Report View",
      type: "select",
      required: true,
      options: REPORT_VIEW_OPTIONS,
    },
  ],
  output: [
    { key: "groupingOptions", type: "array", label: "Dimensions to group by" },
    { key: "statistics", type: "array", label: "Columns that can be aggregated" },
    {
      key: "filters",
      type: "array",
      label: "Available filters — `{ selector, name, description, filterType }`",
    },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request("/report/setup", {
      query: { search_view: input.searchView },
    });
  },
};

export default reportSetupGet;
