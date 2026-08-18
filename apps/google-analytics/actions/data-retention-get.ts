import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/dataRetentionSettings` — verified against
 * Google's Admin API discovery document
 * (`analyticsadmin.properties.getDataRetentionSettings`).
 *
 * How long GA4 keeps event-level data for this property. A compliance answer
 * rather than a reporting one, and a singleton resource — there is nothing to
 * list.
 */
const action: ActionDefinition = {
  key: "data-retention-get",
  type: "read",
  resource: "property",
  title: "Get data retention settings",
  description: "Read how long this property retains event-level data.",
  params: [PROPERTY_PARAM],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "eventDataRetention", type: "string", label: "Event data retention" },
    {
      key: "resetUserDataOnNewActivity",
      type: "boolean",
      label: "Reset user data on new activity",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    ctx.log("info", "getting GA4 data retention settings", { property });

    return await new GoogleAnalyticsClient(ctx).admin(
      `/properties/${encodeURIComponent(property)}/dataRetentionSettings`,
    );
  },
};

export default action;
