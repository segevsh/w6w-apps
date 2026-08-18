import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { LIST_PARAMS, PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/keyEvents` — verified against Google's
 * Admin API discovery document (`analyticsadmin.properties.keyEvents.list`).
 *
 * **Key events, not conversion events.** Google renamed the concept and the
 * v1beta document still carries both resources: `conversionEvents` is the older
 * name for the same thing. This app uses `keyEvents`, the current one, rather
 * than shipping two actions that report the same list under different names.
 */
const action: ActionDefinition = {
  key: "key-event-list",
  type: "read",
  resource: "keyEvent",
  title: "List key events",
  description: "List a property's key events — what GA4 used to call conversion events.",
  params: [PROPERTY_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing GA4 key events", { property, returnAll, limit });

    return await client.adminAll(
      `/properties/${encodeURIComponent(property)}/keyEvents`,
      "keyEvents",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
