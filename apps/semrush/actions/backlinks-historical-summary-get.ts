import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";
import { fieldsParam, limitParam, SCOPE_NO_SUBFOLDER, scopeParam } from "../lib/params.ts";

/**
 * `GET /apis/v4/backlinks/v1/summary` — a target's backlink profile month by month.
 *
 * The historical counterpart to the overview: one row per month, so a workflow
 * can plot growth or spot a link-loss event.
 *
 * `data` is an array of `{backlinks_count, domains_count, follows_count,
 * month_date, score, url}` — `month_date` is the `YYYY-MM` bucket. The endpoint
 * accepts the three-target scope set (no `SUBFOLDER`, which a monthly series
 * has no meaning for) and `limit` defaults to 12 months, i.e. a year.
 */
interface Input {
  url: string;
  scope: string;
  fields?: string[];
  limit?: number;
  date_from?: string;
  date_to?: string;
}

const backlinksHistoricalSummaryGet: ActionDefinition<Input> = {
  key: "backlinks-historical-summary-get",
  type: "read",
  resource: "backlinks",
  title: "Get Historical Backlink Summary",
  description: "Read a target's month-by-month backlink totals, oldest bucket included by date.",
  params: [
    {
      key: "url",
      label: "Target",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "A domain, subdomain or exact URL — `scope` says which one is meant.",
    },
    scopeParam(SCOPE_NO_SUBFOLDER),
    fieldsParam,
    limitParam(12, "Monthly rows to return. Defaults to 12 — one year of history."),
    {
      key: "date_from",
      label: "From month",
      type: "string",
      placeholder: "2024-01",
      hint: "Earliest month to include, as `YYYY-MM`.",
    },
    {
      key: "date_to",
      label: "To month",
      type: "string",
      placeholder: "2026-09",
      hint: "Latest month to include, as `YYYY-MM`.",
    },
  ],
  output: [{ key: "data", type: "array", label: "One row per month" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<unknown[]>("/backlinks/v1/summary", {
        query: {
          url: input.url,
          scope: input.scope,
          fields: input.fields,
          limit: input.limit,
          date_from: input.date_from,
          date_to: input.date_to,
        },
      });
    return { data: data ?? [] };
  },
};

export default backlinksHistoricalSummaryGet;
