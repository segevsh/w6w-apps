import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { LIST_PARAMS, PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/customDimensions` — verified against
 * Google's Admin API discovery document
 * (`analyticsadmin.properties.customDimensions.list`).
 *
 * A custom dimension's `parameterName` is what the event sends; its
 * API name in a report is `customEvent:{parameterName}`. That mapping is not
 * guessable from a report, which is why listing them is worth an action.
 */
const action: ActionDefinition = {
  key: "custom-dimension-list",
  type: "read",
  resource: "customDimension",
  title: "List custom dimensions",
  description: "List a property's custom dimensions and the parameters behind them.",
  params: [PROPERTY_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing GA4 custom dimensions", { property, returnAll, limit });

    return await client.adminAll(
      `/properties/${encodeURIComponent(property)}/customDimensions`,
      "customDimensions",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
