import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, json, query } from "../lib/client.ts";
import { END_PARAM, START_PARAM } from "../lib/params.ts";

/**
 * `GET /api/2/events/segmentation` — the query behind almost every Amplitude
 * chart.
 *
 * ## The parameters are JSON strings inside query parameters
 *
 * `e` is not a field name; it is a JSON object, serialised, URL-encoded, and
 * passed as a query parameter:
 *
 *     e = {"event_type":"Checkout Completed","filters":[…]}
 *
 * So is `e2` for a second series, and `s` for each segment definition. This is
 * unusual enough that it is worth stating plainly — the action takes them as
 * JSON and serialises them, so nobody has to double-encode by hand.
 *
 * ## `_active` and `_new` are the two pseudo-events
 *
 * Setting `event_type` to `_active` counts active users and `_new` counts new
 * ones, without either being an event anybody sends. They are the only way to
 * ask those questions here, and they are not discoverable from `event-list`.
 *
 * ## The response is a parallel-array shape
 *
 * `data.series` is an array of arrays of numbers, and `data.xValues` is the
 * dates they line up against. There are no objects and no labels inside the
 * series — the *n*th number in a series belongs to the *n*th date, and
 * `seriesLabels` names the series. Reading it any other way silently
 * misattributes every value.
 */
const action: ActionDefinition = {
  key: "event-segmentation",
  type: "search",
  resource: "chart",
  title: "Query event segmentation",
  description:
    "The query behind most Amplitude charts. The response is PARALLEL ARRAYS — series of numbers " +
    "lined up against a separate list of dates, with no labels inside them.",
  params: [
    {
      key: "event",
      label: "Event",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"event_type":"Checkout Completed"}',
      hint: "A JSON object. `_active` counts active users and `_new` counts new ones — neither " +
        "is a real event and neither appears in `event-list`.",
    },
    START_PARAM,
    END_PARAM,
    {
      key: "metric",
      label: "Metric",
      type: "select",
      default: "uniques",
      options: [
        { value: "uniques", label: "Unique users" },
        { value: "totals", label: "Total events" },
        { value: "pct_dau", label: "Percent of daily active users" },
        { value: "average", label: "Average per user" },
        { value: "histogram", label: "Histogram" },
        { value: "sums", label: "Sum of a property" },
        { value: "value_avg", label: "Average of a property" },
      ],
    },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      default: "1",
      options: [
        { value: "1", label: "Daily" },
        { value: "7", label: "Weekly" },
        { value: "30", label: "Monthly" },
        { value: "-300000", label: "Real-time (5 minutes)" },
        { value: "-3600000", label: "Hourly" },
      ],
      hint: "Amplitude encodes these as numbers, and the sub-daily ones as negative milliseconds.",
    },
    {
      key: "groupBy",
      label: "Group By",
      type: "string",
      default: "",
      advanced: true,
      hint: "A property to segment by, e.g. `country`. Amplitude's own parameter is `g`.",
    },
    {
      key: "segments",
      label: "Segments",
      type: "json",
      default: "",
      advanced: true,
      hint: "A JSON array of segment definitions, each becoming an `s` parameter.",
    },
    {
      key: "limit",
      label: "Group Limit",
      type: "number",
      default: 0,
      advanced: true,
      hint: "How many groups to return when grouping. Amplitude's default is 100.",
    },
  ],
  output: [
    { key: "series", type: "array", label: "Arrays of numbers, one per series" },
    { key: "xValues", type: "array", label: "The dates each number lines up against" },
    { key: "seriesLabels", type: "array", label: "What each series is" },
    { key: "points", type: "array", label: "The same data zipped into {date, label, value}" },
    { key: "total", type: "number", label: "Sum across the first series" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const event = json(p.event, "event");
    if (!event) throw new Error("`event` is required");
    const start = String(p.start ?? "").trim();
    const end = String(p.end ?? "").trim();
    if (!start || !end) throw new Error("`start` and `end` are both required");

    const parameters: Record<string, unknown> = query({
      // A JSON object, serialised into a query parameter.
      e: JSON.stringify(event),
      start,
      end,
      m: p.metric,
      i: p.interval,
      g: p.groupBy,
      limit: Number(p.limit ?? 0) > 0 ? Number(p.limit) : undefined,
    });

    const segments = json(p.segments, "segments");
    if (Array.isArray(segments) && segments.length > 0) {
      // Each segment is its own `s` parameter, also JSON-in-a-string.
      parameters.s = JSON.stringify(segments[0]);
    }

    const result = await new AmplitudeClient(ctx).dashboard<{
      data?: {
        series?: number[][];
        seriesLabels?: unknown[];
        xValues?: string[];
        seriesCollapsed?: Array<Array<{ value?: number }>>;
      };
    }>("/api/2/events/segmentation", { query: parameters as Record<string, string> });

    const data = result?.data ?? {};
    const series = data.series ?? [];
    const xValues = data.xValues ?? [];
    const labels = data.seriesLabels ?? [];

    // Parallel arrays are how this endpoint answers, and reading them any other
    // way misattributes every value — so the zipped form is offered too.
    const points: Array<{ date?: string; label?: unknown; value: number }> = [];
    series.forEach((line, seriesIndex) => {
      line.forEach((value, pointIndex) => {
        points.push({
          date: xValues[pointIndex],
          label: labels[seriesIndex],
          value,
        });
      });
    });

    ctx.log("info", "queried Amplitude segmentation", {
      series: series.length,
      points: points.length,
    });

    return {
      series,
      xValues,
      seriesLabels: labels,
      points,
      total: (series[0] ?? []).reduce((sum, value) => sum + Number(value ?? 0), 0),
    };
  },
};

export default action;
