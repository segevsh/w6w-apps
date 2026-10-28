import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { LIST_PARAMS, PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/customMetrics` — verified against
 * Google's Admin API discovery document
 * (`analyticsadmin.properties.customMetrics.list`).
 */
const action: ActionDefinition = {
  key: "custom-metric-list",
  type: "read",
  resource: "customMetric",
  title: "List custom metrics",
  description: "List a property's custom metrics.",
  params: [PROPERTY_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing GA4 custom metrics", { property, returnAll, limit });

    return await client.adminAll(
      `/properties/${encodeURIComponent(property)}/customMetrics`,
      "customMetrics",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
