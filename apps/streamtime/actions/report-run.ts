import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";
import { REPORT_VIEW_OPTIONS, SEARCH_QUERY_HINT, STATISTIC_MODE_OPTIONS } from "../lib/params.ts";

/**
 * `POST /report` — aggregate, instead of pulling records back.
 *
 * Separate from `/search`, and the vendor's own examples show the split:
 * "How many jobs are there in the system?", "What's the total and average value
 * of all my invoices that were issued last month?", "Give me a monthly breakdown
 * of the total time spent on all my jobs."
 *
 * The three rules the request schema states, which are easy to get wrong:
 *
 *  1. **Omit `groupBy` for a single grand total.** With no grouping the response
 *     is the totals, not a row per record.
 *  2. **`dateField` is required whenever `startDate` or `endDate` is given**, and
 *     must be one of the `dateFieldOptions` from `report-setup-get` — the report
 *     needs to know which date column the range applies to.
 *  3. **`column` is only needed when `mode` is not `count`.**
 *
 * `time_breakdown=true` splits the result into daily/weekly/monthly buckets,
 * sized by the span of the range — "short searches will get daily breakdown,
 * and longer searches will get monthly".
 *
 * The 200 declares no schema, so the body is returned under a named field
 * unchanged.
 */
interface Input {
  statistics: Array<{ mode: string; column?: string }>;
  searchView?: string;
  startDate?: string;
  endDate?: string;
  dateField?: string;
  groupBy?: string;
  query?: string;
  timeBreakdown?: boolean;
}

const reportRun: ActionDefinition<Input, { report: unknown }> = {
  key: "report-run",
  type: "search",
  resource: "report",
  title: "Run Report",
  description:
    "Run an aggregate report — totals, averages and grouped breakdowns over jobs, time, expenses, " +
    "quotes, invoices, job groups, companies, contacts or users.",
  params: [
    {
      key: "statistics",
      label: "Statistics",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          {
            key: "mode",
            label: "Mode",
            type: "select",
            required: true,
            options: STATISTIC_MODE_OPTIONS,
          },
          {
            key: "column",
            label: "Column",
            type: "string",
            hint: "Only needed when mode is not count. Take it from Report Setup.",
          },
        ],
      },
      hint: "At least one aggregation. Streamtime requires this array.",
    },
    {
      key: "searchView",
      label: "Report View",
      type: "select",
      options: REPORT_VIEW_OPTIONS,
      hint: "The data you are reporting on.",
    },
    {
      key: "startDate",
      label: "Start Date",
      type: "date",
      hint: "Providing either date requires a date field.",
    },
    { key: "endDate", label: "End Date", type: "date" },
    {
      key: "dateField",
      label: "Date Field",
      type: "string",
      hint: "Which date column the range applies to, e.g. job_start_date. Required with a range.",
    },
    {
      key: "groupBy",
      label: "Group By",
      type: "string",
      hint: "Omit for one grand total. Avoid grouping by a record's own id — that is just a list.",
    },
    { key: "query", label: "Query", type: "text", hint: SEARCH_QUERY_HINT },
    {
      key: "timeBreakdown",
      label: "Time Breakdown",
      type: "boolean",
      default: false,
      hint: "Split results into daily/weekly/monthly buckets across the date range.",
    },
  ],
  output: [
    {
      key: "report",
      type: "object",
      label: "The report body — totals and, when grouped, one entry per group",
    },
  ],

  async execute(input, ctx) {
    if (!Array.isArray(input.statistics) || input.statistics.length === 0) {
      throw new Error("statistics is required — Streamtime rejects a report without it");
    }
    if ((input.startDate || input.endDate) && !input.dateField) {
      throw new Error(
        "dateField is required when a start or end date is given — the report has to know which " +
          "date column the range applies to",
      );
    }
    const report = await new StreamtimeClient(ctx).request("/report", {
      method: "POST",
      query: compact({
        search_view: input.searchView,
        time_breakdown: input.timeBreakdown === true ? "true" : undefined,
      }),
      body: compact({
        statistics: input.statistics,
        startDate: input.startDate,
        endDate: input.endDate,
        dateField: input.dateField,
        groupBy: input.groupBy,
        query: input.query,
      }),
    });
    return { report: report ?? null };
  },
};

export default reportRun;
