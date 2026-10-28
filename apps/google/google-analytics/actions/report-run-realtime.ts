import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  csv,
  GoogleAnalyticsClient,
  json,
  named,
  resolveProperty,
} from "../lib/client.ts";
import {
  DIMENSION_FILTER_PARAM,
  DIMENSIONS_PARAM,
  METRICS_PARAM,
  ORDER_BYS_PARAM,
  PROPERTY_PARAM,
} from "../lib/params.ts";

/**
 * `POST /v1beta/properties/{property}:runRealtimeReport` — verified against
 * Google's Data API discovery document
 * (`analyticsdata.properties.runRealtimeReport`).
 *
 * A different request type from `runReport`, not a flag on it: the schema takes
 * `minuteRanges` and has **no `dateRanges` at all**, because realtime only
 * looks at the last 30 minutes. Realtime also supports a much smaller set of
 * dimensions and metrics than the standard report — `metadata-get` is what
 * tells you which.
 */
const action: ActionDefinition = {
  key: "report-run-realtime",
  type: "read",
  resource: "report",
  title: "Run a realtime report",
  description: "Report on activity in the last 30 minutes.",
  params: [
    PROPERTY_PARAM,
    {
      ...DIMENSIONS_PARAM,
      placeholder: "unifiedScreenName,country",
      hint: "Comma-separated. Realtime supports a smaller set than standard reports.",
    },
    { ...METRICS_PARAM, required: true, placeholder: "activeUsers" },
    {
      key: "minutesAgoStart",
      label: "Minutes Ago (Start)",
      type: "number",
      default: null,
      hint: "0–29, counting back from now. Leave blank for GA4's default window.",
    },
    { key: "minutesAgoEnd", label: "Minutes Ago (End)", type: "number", default: null },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    DIMENSION_FILTER_PARAM,
    ORDER_BYS_PARAM,
    { key: "returnPropertyQuota", label: "Return Quota State", type: "boolean", default: false },
  ],
  output: [
    { key: "rows", type: "array", label: "Rows" },
    { key: "rowCount", type: "number", label: "Total matching rows" },
    { key: "dimensionHeaders", type: "array", label: "Dimension headers" },
    { key: "metricHeaders", type: "array", label: "Metric headers" },
    { key: "totals", type: "array", label: "Totals" },
    { key: "propertyQuota", type: "object", label: "Quota state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const metrics = csv(p.metrics);
    if (!metrics) throw new Error("`metrics` is required — at least one GA4 metric name");

    const start = typeof p.minutesAgoStart === "number" ? p.minutesAgoStart : undefined;
    const end = typeof p.minutesAgoEnd === "number" ? p.minutesAgoEnd : undefined;
    const minuteRanges = start === undefined && end === undefined
      ? undefined
      : [compact({ startMinutesAgo: start, endMinutesAgo: end })];

    const body = compact({
      dimensions: named(csv(p.dimensions)),
      metrics: named(metrics),
      minuteRanges,
      limit: typeof p.limit === "number" ? String(p.limit) : undefined,
      dimensionFilter: json(p.dimensionFilter, "dimensionFilter"),
      orderBys: json(p.orderBys, "orderBys"),
      returnPropertyQuota: p.returnPropertyQuota === true ? true : undefined,
    });

    ctx.log("info", "running GA4 realtime report", { property, metrics });

    return await new GoogleAnalyticsClient(ctx).data(
      `/properties/${encodeURIComponent(property)}:runRealtimeReport`,
      { method: "POST", body },
    );
  },
};

export default action;
