import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient, queryDate } from "../lib/client.ts";
import { DATE_RANGE_PARAMS, WHERE_PARAM } from "../lib/params.ts";

/**
 * `GET /api/query/segmentation` — counts for **one** event over a date range,
 * optionally broken down by a property.
 *
 * The workhorse when there is no saved report to point at, and the thing to
 * understand about it is `type`:
 *
 *   - **`general`** counts events — five purchases by one person is five.
 *   - **`unique`** counts *people* — the same five purchases are one.
 *   - **`average`** averages the numeric property named by `on`.
 *
 * Reporting "users" from a `general` query is the most common way to overstate
 * a number by an order of magnitude, so the parameter is required-with-a-default
 * rather than left implicit.
 *
 * `on` and `where` are Mixpanel's own expression language, not SQL and not
 * JSON: property names are bracketed and quoted (`properties["plan"]`). A bare
 * name is a syntax error.
 *
 * One event per call — segmenting several means several calls, and the Query
 * API allows sixty an hour for the whole project.
 */
const action: ActionDefinition = {
  key: "segmentation-query",
  type: "read",
  resource: "report",
  title: "Segment an event",
  description:
    "Counts for one event over a date range, optionally broken down by a property. Choose " +
    "carefully between counting events and counting people.",
  params: [
    {
      key: "event",
      label: "Event",
      type: "string",
      required: true,
      default: "",
      placeholder: "Signed Up",
      hint: "Exactly one event name. `event-name-list` has the spellings.",
    },
    ...DATE_RANGE_PARAMS,
    {
      key: "type",
      label: "Count",
      type: "select",
      default: "general",
      options: [
        { value: "general", label: "Events — every occurrence" },
        { value: "unique", label: "People — one per user" },
        { value: "average", label: "Average of the property named in Breakdown" },
      ],
      hint: "Reporting a `general` count as a user count is the classic way to overstate a " +
        "number tenfold.",
    },
    {
      key: "on",
      label: "Breakdown",
      type: "string",
      default: "",
      placeholder: 'properties["plan"]',
      hint: "A property expression to split the counts by.",
    },
    WHERE_PARAM,
    {
      key: "unit",
      label: "Bucket",
      type: "select",
      default: "day",
      options: [
        { value: "minute", label: "Minute" },
        { value: "hour", label: "Hour" },
        { value: "day", label: "Day" },
        { value: "month", label: "Month" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 60,
      advanced: true,
      hint: "How many breakdown values to return. Mixpanel's maximum is 10,000.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Series and values" },
    { key: "legend_size", type: "number", label: "Breakdown values returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const event = String(p.event ?? "").trim();
    if (!event) throw new Error("`event` is required");
    const from = queryDate(p.fromDate, "fromDate");
    const to = queryDate(p.toDate, "toDate");
    if (!from || !to) throw new Error("`fromDate` and `toDate` are both required");

    const limit = Number(p.limit ?? 60);
    return await new MixpanelClient(ctx).request("/api/query/segmentation", {
      query: {
        event,
        from_date: from,
        to_date: to,
        type: String(p.type ?? "general"),
        on: String(p.on ?? "") || undefined,
        where: String(p.where ?? "") || undefined,
        unit: String(p.unit ?? "day"),
        limit: Number.isFinite(limit) && limit > 0 ? Math.min(10000, limit) : undefined,
      },
    });
  },
};

export default action;
