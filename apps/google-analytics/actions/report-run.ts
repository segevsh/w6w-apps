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
  ORDER_BYS_PARAM,
  PROPERTY_PARAM,
} from "../lib/params.ts";

/**
 * `POST /v1beta/properties/{property}:runReport` — verified against Google's
 * Data API discovery document (`analyticsdata.properties.runReport`).
 *
 * The core action of the app: everything else exists to find the ids this one
 * needs. Dimensions and metrics are taken as comma-separated names and expanded
 * into GA4's `[{name}]` arrays, because making a form author type
 * `[{"name":"date"}]` for the common case would be hostile. Filters and
 * `orderBys` stay JSON — they are nested expression trees, and flattening them
 * into fields could only express the simplest case.
 */
const action: ActionDefinition = {
  key: "report-run",
  type: "read",
  resource: "report",
  title: "Run a report",
  description: "Run a GA4 report over a date range, with dimensions, metrics and filters.",
  params: [
    PROPERTY_PARAM,
    DIMENSIONS_PARAM,
    { ...METRICS_PARAM, required: true },
    {
      key: "startDate",
      label: "Start Date",
      type: "string",
      default: "28daysAgo",
      hint: "YYYY-MM-DD, or GA4's relative forms: `today`, `yesterday`, `NdaysAgo`.",
    },
    { key: "endDate", label: "End Date", type: "string", default: "yesterday" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 1000,
      hint: "Rows to return. GA4 defaults to 10,000 and caps a request at 250,000.",
    },
    { key: "offset", label: "Offset", type: "number", default: null, hint: "First row to return." },
    DIMENSION_FILTER_PARAM,
    METRIC_FILTER_PARAM,
    ORDER_BYS_PARAM,
    {
      key: "keepEmptyRows",
      label: "Keep Empty Rows",
      type: "boolean",
      default: false,
      hint: "By default GA4 drops rows where every metric is 0.",
    },
    {
      key: "returnPropertyQuota",
      label: "Return Quota State",
      type: "boolean",
      default: false,
      hint: "Include this property's remaining token allowance in the response.",
    },
    {
      key: "currencyCode",
      label: "Currency Code",
      type: "string",
      default: "",
      placeholder: "USD",
      hint: "ISO 4217. Overrides the property's own currency for monetary metrics.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "Rows" },
    { key: "rowCount", type: "number", label: "Total matching rows" },
    { key: "dimensionHeaders", type: "array", label: "Dimension headers" },
    { key: "metricHeaders", type: "array", label: "Metric headers" },
    { key: "totals", type: "array", label: "Totals" },
    { key: "maximums", type: "array", label: "Maximums" },
    { key: "minimums", type: "array", label: "Minimums" },
    { key: "metadata", type: "object", label: "Report metadata" },
    { key: "propertyQuota", type: "object", label: "Quota state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const metrics = csv(p.metrics);
    if (!metrics) throw new Error("`metrics` is required — at least one GA4 metric name");

    const body = compact({
      dimensions: named(csv(p.dimensions)),
      metrics: named(metrics),
      dateRanges: [{
        startDate: (p.startDate as string) || "28daysAgo",
        endDate: (p.endDate as string) || "yesterday",
      }],
      // GA4 types limit and offset as int64, which JSON-encodes as a string.
      limit: typeof p.limit === "number" ? String(p.limit) : undefined,
      offset: typeof p.offset === "number" ? String(p.offset) : undefined,
      dimensionFilter: json(p.dimensionFilter, "dimensionFilter"),
      metricFilter: json(p.metricFilter, "metricFilter"),
      orderBys: json(p.orderBys, "orderBys"),
      keepEmptyRows: p.keepEmptyRows === true ? true : undefined,
      returnPropertyQuota: p.returnPropertyQuota === true ? true : undefined,
      currencyCode: p.currencyCode,
    });

    ctx.log("info", "running GA4 report", { property, metrics });

    return await new GoogleAnalyticsClient(ctx).data(
      `/properties/${encodeURIComponent(property)}:runReport`,
      { method: "POST", body },
    );
  },
};

export default action;
