import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  target: string;
  dateFrom: string;
  dateTo?: string;
  historyGrouping?: string;
}

/** `GET /site-explorer/domain-rating-history` — response key `domain_ratings`. */
const domainRatingHistory: ActionDefinition<Input> = {
  key: "domain-rating-history",
  type: "read",
  resource: "domain",
  title: "Get Domain Rating History",
  description: "Domain Rating over time for a domain or URL.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "string",
      required: true,
      hint: "The domain or URL to analyse, e.g. `example.com` or `example.com/blog/`.",
    },
    {
      key: "dateFrom",
      label: "From date",
      type: "string",
      required: true,
      hint: "Start of the period, `YYYY-MM-DD`.",
    },
    {
      key: "dateTo",
      label: "To date",
      type: "string",
      hint: "End of the period, `YYYY-MM-DD`. Omit for today.",
    },
    {
      key: "historyGrouping",
      label: "Grouping",
      type: "select",
      hint: "Interval the history is grouped by.",
      options: [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, {
        value: "monthly",
        label: "Monthly",
      }],
    },
  ],
  output: [
    { key: "domain_ratings", type: "array", label: "Dated Domain Ratings" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-explorer/domain-rating-history", {
      target: input.target,
      date_from: input.dateFrom,
      date_to: input.dateTo,
      history_grouping: input.historyGrouping,
    });
  },
};

export default domainRatingHistory;
