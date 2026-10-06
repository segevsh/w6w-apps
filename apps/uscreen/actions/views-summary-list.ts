import type { ActionDefinition } from "@w6w/types";
import { UscreenClient } from "../lib/client.ts";
import { PAGE, PER_PAGE, rangeParams } from "../lib/params.ts";

interface Input {
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

const viewsSummaryList: ActionDefinition<Input> = {
  key: "views-summary-list",
  type: "search",
  resource: "analytics",
  title: "List Views Summary",
  description:
    "Aggregated view counts and watch time grouped by customer and video. Total-Count is capped at 10000+ on this endpoint.",
  params: [
    ...rangeParams(" Must be within the last 12 months. Default: 12 months ago."),
    PAGE,
    PER_PAGE,
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "totalCount", type: "number", label: "Total-Count header (null when absent)" },
    {
      key: "totalCountCapped",
      type: "boolean",
      label: "True when the total was reported as 10000+",
    },
    { key: "page", type: "number", label: "Page returned" },
    { key: "nextPage", type: "number", label: "Next page number, or null on the last page" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new UscreenClient(ctx).list("/analytics/videos/views/summary", {
      "from": input.from,
      "to": input.to,
      "page": input.page,
      "per_page": input.perPage,
    });
  },
};

export default viewsSummaryList;
