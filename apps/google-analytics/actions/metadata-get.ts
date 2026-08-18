import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/metadata` — verified against Google's
 * Data API discovery document (`analyticsdata.properties.getMetadata`).
 *
 * The lookup table for every other reporting action: it returns the dimensions
 * and metrics **this property** supports, including its custom ones, with the
 * API names the report actions want. Reaching for it beats guessing a name and
 * reading GA4's error.
 */
const action: ActionDefinition = {
  key: "metadata-get",
  type: "read",
  resource: "metadata",
  title: "Get available dimensions and metrics",
  description: "List the dimensions and metrics this property supports, custom ones included.",
  params: [PROPERTY_PARAM],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "dimensions", type: "array", label: "Dimensions" },
    { key: "metrics", type: "array", label: "Metrics" },
    { key: "comparisons", type: "array", label: "Comparisons" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    ctx.log("info", "getting GA4 metadata", { property });

    return await new GoogleAnalyticsClient(ctx).data(
      `/properties/${encodeURIComponent(property)}/metadata`,
    );
  },
};

export default action;
