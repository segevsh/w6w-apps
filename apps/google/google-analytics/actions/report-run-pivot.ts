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
  METRIC_FILTER_PARAM,
  METRICS_PARAM,
  PROPERTY_PARAM,
} from "../lib/params.ts";

/**
 * `POST /v1beta/properties/{property}:runPivotReport` — verified against
 * Google's Data API discovery document
 * (`analyticsdata.properties.runPivotReport`).
 *
 * `pivots` is passed as JSON. Each pivot names its `fieldNames`, a `limit`, an
 * `offset`, `orderBys` and `metricAggregations`, and a report can carry
 * several — a shape no set of flat form fields represents without lying about
 * what is possible.
 */
const action: ActionDefinition = {
  key: "report-run-pivot",
  type: "read",
  resource: "report",
  title: "Run a pivot report",
  description: "Run a GA4 report with one or more pivots.",
  params: [
    PROPERTY_PARAM,
    { ...DIMENSIONS_PARAM, required: true },
    { ...METRICS_PARAM, required: true },
    {
      key: "pivots",
      label: "Pivots",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"fieldNames":["country"],"limit":10}]',
      hint: "A GA4 Pivot array. Each names its fieldNames and its own limit/offset/orderBys.",
    },
    { key: "startDate", label: "Start Date", type: "string", default: "28daysAgo" },
    { key: "endDate", label: "End Date", type: "string", default: "yesterday" },
    DIMENSION_FILTER_PARAM,
    METRIC_FILTER_PARAM,
    { key: "currencyCode", label: "Currency Code", type: "string", default: "" },
    { key: "returnPropertyQuota", label: "Return Quota State", type: "boolean", default: false },
  ],
  output: [
    { key: "rows", type: "array", label: "Rows" },
    { key: "pivotHeaders", type: "array", label: "Pivot headers" },
    { key: "dimensionHeaders", type: "array", label: "Dimension headers" },
    { key: "metricHeaders", type: "array", label: "Metric headers" },
    { key: "aggregates", type: "array", label: "Aggregates" },
    { key: "metadata", type: "object", label: "Report metadata" },
    { key: "propertyQuota", type: "object", label: "Quota state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const dimensions = csv(p.dimensions);
    const metrics = csv(p.metrics);
    const pivots = json(p.pivots, "pivots");
    if (!dimensions) throw new Error("`dimensions` is required for a pivot report");
    if (!metrics) throw new Error("`metrics` is required");
    if (!Array.isArray(pivots) || pivots.length === 0) {
      throw new Error("`pivots` is required — a non-empty GA4 Pivot array");
    }

    const body = compact({
      dimensions: named(dimensions),
      metrics: named(metrics),
      pivots,
      dateRanges: [{
        startDate: (p.startDate as string) || "28daysAgo",
        endDate: (p.endDate as string) || "yesterday",
      }],
      dimensionFilter: json(p.dimensionFilter, "dimensionFilter"),
      metricFilter: json(p.metricFilter, "metricFilter"),
      currencyCode: p.currencyCode,
      returnPropertyQuota: p.returnPropertyQuota === true ? true : undefined,
    });

    ctx.log("info", "running GA4 pivot report", { property, dimensions, metrics });

    return await new GoogleAnalyticsClient(ctx).data(
      `/properties/${encodeURIComponent(property)}:runPivotReport`,
      { method: "POST", body },
    );
  },
};

export default action;
