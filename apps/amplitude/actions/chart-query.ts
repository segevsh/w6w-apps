import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient } from "../lib/client.ts";

/**
 * `GET /api/3/chart/{id}/query` — run a chart somebody already built.
 *
 * ## The practical alternative to reconstructing a query
 *
 * `event-segmentation` and `funnel-query` need the question expressed as JSON
 * parameters, which for anything non-trivial means reverse-engineering a chart
 * that already exists and works. This runs the saved chart instead, exactly as
 * the UI does, and returns its result.
 *
 * That makes the division of labour a sensible one: somebody builds the chart
 * in Amplitude where building charts is easy, and the workflow reads it.
 *
 * ## The chart id is in the URL, and the response shape is the chart's
 *
 * From `https://app.amplitude.com/analytics/…/chart/abc123/…`, the id is
 * `abc123`. What comes back depends entirely on what kind of chart it is — a
 * segmentation returns series, a funnel returns step functions — so this
 * returns the body as it is rather than pretending to a common shape.
 *
 * ## It runs the chart as saved, including its date range
 *
 * A chart set to "last 30 days" is always the last 30 days from *now*. There is
 * no way to override the window here; a query needing its own dates is a
 * `event-segmentation` call.
 */
const action: ActionDefinition = {
  key: "chart-query",
  type: "search",
  resource: "chart",
  title: "Run a saved chart",
  description:
    "Run a chart somebody already built, instead of reconstructing its query. It uses the " +
    "chart's own saved date range, which cannot be overridden here.",
  params: [
    {
      key: "chartId",
      label: "Chart ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "abc123",
      hint: "From the chart's URL: `…/analytics/…/chart/abc123/…`.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The chart's result, in whatever shape it has" },
    { key: "chartId", type: "string", label: "Which chart" },
    { key: "seriesCount", type: "number", label: "Series returned, when the shape has any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const chartId = String(p.chartId ?? "").trim();
    if (!chartId) throw new Error("`chartId` is required");
    if (chartId.includes("/")) {
      throw new Error(
        `\`chartId\` should be just the id, not a URL — from ` +
          "`…/chart/abc123/…` that is `abc123`",
      );
    }

    const result = await new AmplitudeClient(ctx).dashboard<{
      data?: { series?: unknown[] };
    }>(`/api/3/chart/${encodeURIComponent(chartId)}/query`);

    // The shape depends on the chart type, so only the series count is safe to
    // report generically.
    const series = result?.data?.series;
    ctx.log("info", "ran a saved Amplitude chart", {
      chartId,
      seriesCount: Array.isArray(series) ? series.length : undefined,
    });

    return {
      data: result?.data ?? result,
      chartId,
      seriesCount: Array.isArray(series) ? series.length : undefined,
    };
  },
};

export default action;
