import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  csv,
  GoogleAnalyticsClient,
  json,
  named,
  resolveProperty,
} from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1beta/properties/{property}:runAccessReport` — verified against
 * Google's **Admin** API discovery document
 * (`analyticsadmin.properties.runAccessReport`). Note the host: this is a
 * report, but it lives on the Admin API, not the Data API.
 *
 * It answers a different question from every other report here — *who read
 * this property's data, and when* — which is what an access audit needs. Its
 * dimensions and metrics are their own vocabulary (`accessDate`,
 * `userEmail`, `accessCount`), not the reporting ones.
 */
const action: ActionDefinition = {
  key: "access-report-run",
  type: "read",
  resource: "report",
  title: "Run a data access report",
  description: "Audit who accessed this property's data, and when.",
  params: [
    PROPERTY_PARAM,
    {
      key: "dimensions",
      label: "Dimensions",
      type: "string",
      default: "accessDate,userEmail",
      hint: "Comma-separated access dimensions — `accessDate`, `userEmail`, `accessMechanism`, …",
    },
    {
      key: "metrics",
      label: "Metrics",
      type: "string",
      default: "accessCount",
      hint: "Comma-separated access metrics. `accessCount` is the usual one.",
    },
    { key: "startDate", label: "Start Date", type: "string", default: "7daysAgo" },
    { key: "endDate", label: "End Date", type: "string", default: "yesterday" },
    { key: "limit", label: "Limit", type: "number", default: 1000 },
    { key: "offset", label: "Offset", type: "number", default: null },
    {
      key: "dimensionFilter",
      label: "Dimension Filter",
      type: "json",
      default: "",
      hint: "An AccessFilterExpression — the access report's own filter vocabulary.",
    },
    {
      key: "includeAllUsers",
      label: "Include Users With No Access",
      type: "boolean",
      default: false,
    },
    {
      key: "expandGroups",
      label: "Expand Groups",
      type: "boolean",
      default: false,
      hint: "Return the users inside user groups rather than the groups.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "Rows" },
    { key: "rowCount", type: "number", label: "Total matching rows" },
    { key: "dimensionHeaders", type: "array", label: "Dimension headers" },
    { key: "metricHeaders", type: "array", label: "Metric headers" },
    { key: "quota", type: "object", label: "Entity quota state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const dimensions = csv(p.dimensions) ?? ["accessDate", "userEmail"];
    const metrics = csv(p.metrics) ?? ["accessCount"];

    const body = compact({
      dimensions: named(dimensions),
      metrics: named(metrics),
      dateRanges: [{
        startDate: (p.startDate as string) || "7daysAgo",
        endDate: (p.endDate as string) || "yesterday",
      }],
      limit: typeof p.limit === "number" ? String(p.limit) : undefined,
      offset: typeof p.offset === "number" ? String(p.offset) : undefined,
      dimensionFilter: json(p.dimensionFilter, "dimensionFilter"),
      includeAllUsers: p.includeAllUsers === true ? true : undefined,
      expandGroups: p.expandGroups === true ? true : undefined,
    });

    ctx.log("info", "running GA4 access report", { property });

    // Admin API, not Data API — the one report that does.
    return await new GoogleAnalyticsClient(ctx).admin(
      `/properties/${encodeURIComponent(property)}:runAccessReport`,
      { method: "POST", body },
    );
  },
};

export default action;
