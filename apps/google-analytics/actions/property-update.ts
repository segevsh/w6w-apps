import type { ActionDefinition } from "@w6w/types";
import { compact, GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `PATCH /v1beta/properties/{property}` — verified against Google's Admin API
 * discovery document (`analyticsadmin.properties.patch`).
 *
 * **Google requires an explicit `updateMask`.** A PATCH without one is
 * rejected: Google will not infer which fields you meant from the body, and
 * omitting a field is not the same as clearing it. So the mask is built from
 * exactly the fields the caller set — which also means an unset field can never
 * accidentally blank a property setting.
 */
const action: ActionDefinition = {
  key: "property-update",
  type: "perform",
  resource: "property",
  title: "Update a property",
  description: "Change a property's display name, time zone, currency or industry.",
  idempotent: true,
  params: [
    PROPERTY_PARAM,
    { key: "displayName", label: "Display Name", type: "string", default: "" },
    { key: "timeZone", label: "Reporting Time Zone", type: "string", default: "" },
    { key: "currencyCode", label: "Currency Code", type: "string", default: "" },
    { key: "industryCategory", label: "Industry Category", type: "string", default: "" },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "timeZone", type: "string", label: "Reporting time zone" },
    { key: "currencyCode", type: "string", label: "Currency code" },
    { key: "updateTime", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);

    const body = compact({
      displayName: p.displayName,
      timeZone: p.timeZone,
      currencyCode: p.currencyCode,
      industryCategory: p.industryCategory,
    });
    const fields = Object.keys(body);
    if (fields.length === 0) throw new Error("nothing to update — set at least one field");

    ctx.log("info", "updating GA4 property", { property, fields });

    return await new GoogleAnalyticsClient(ctx).admin(
      `/properties/${encodeURIComponent(property)}`,
      {
        method: "PATCH",
        body,
        // Built from what was set, never a wildcard: `*` would blank every
        // field the body omits.
        query: { updateMask: fields.join(",") },
      },
    );
  },
};

export default action;
