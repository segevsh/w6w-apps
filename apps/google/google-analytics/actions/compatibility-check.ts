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
 * `POST /v1beta/properties/{property}:checkCompatibility` — verified against
 * Google's Data API discovery document
 * (`analyticsdata.properties.checkCompatibility`).
 *
 * GA4 refuses some dimension/metric combinations outright, and the error from a
 * failed report says which pairing broke but not what would work instead. This
 * asks the question directly: given this set, which fields are still
 * compatible. Worth an action of its own for anyone building a report
 * programmatically.
 */
const action: ActionDefinition = {
  key: "compatibility-check",
  type: "read",
  resource: "metadata",
  title: "Check dimension and metric compatibility",
  description: "Ask which dimensions and metrics can be combined with the ones you have.",
  params: [
    PROPERTY_PARAM,
    DIMENSIONS_PARAM,
    METRICS_PARAM,
    DIMENSION_FILTER_PARAM,
    METRIC_FILTER_PARAM,
    {
      key: "compatibilityFilter",
      label: "Compatibility Filter",
      type: "select",
      default: "",
      options: [
        { value: "COMPATIBLE", label: "Compatible only" },
        { value: "INCOMPATIBLE", label: "Incompatible only" },
      ],
      hint: "Leave blank to return both.",
    },
  ],
  output: [
    { key: "dimensionCompatibilities", type: "array", label: "Dimension compatibilities" },
    { key: "metricCompatibilities", type: "array", label: "Metric compatibilities" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const dimensions = csv(p.dimensions);
    const metrics = csv(p.metrics);
    if (!dimensions && !metrics) {
      throw new Error("set `dimensions`, `metrics`, or both — there is nothing to check otherwise");
    }

    const body = compact({
      dimensions: named(dimensions),
      metrics: named(metrics),
      dimensionFilter: json(p.dimensionFilter, "dimensionFilter"),
      metricFilter: json(p.metricFilter, "metricFilter"),
      compatibilityFilter: p.compatibilityFilter,
    });

    ctx.log("info", "checking GA4 compatibility", { property });

    return await new GoogleAnalyticsClient(ctx).data(
      `/properties/${encodeURIComponent(property)}:checkCompatibility`,
      { method: "POST", body },
    );
  },
};

export default action;
