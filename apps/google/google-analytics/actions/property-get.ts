import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}` — verified against Google's Admin API
 * discovery document (`analyticsadmin.properties.get`).
 */
const action: ActionDefinition = {
  key: "property-get",
  type: "read",
  resource: "property",
  title: "Get a property",
  description: "Retrieve one GA4 property's settings.",
  params: [PROPERTY_PARAM],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "propertyType", type: "string", label: "Property type" },
    { key: "parent", type: "string", label: "Parent" },
    { key: "account", type: "string", label: "Account" },
    { key: "timeZone", type: "string", label: "Reporting time zone" },
    { key: "currencyCode", type: "string", label: "Currency code" },
    { key: "industryCategory", type: "string", label: "Industry category" },
    { key: "serviceLevel", type: "string", label: "Service level" },
    { key: "createTime", type: "string", label: "Created at" },
    { key: "updateTime", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    ctx.log("info", "getting GA4 property", { property });

    return await new GoogleAnalyticsClient(ctx).admin(
      `/properties/${encodeURIComponent(property)}`,
    );
  },
};

export default action;
