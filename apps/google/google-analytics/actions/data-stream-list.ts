import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { LIST_PARAMS, PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/dataStreams` — verified against Google's
 * Admin API discovery document (`analyticsadmin.properties.dataStreams.list`).
 *
 * Data streams are where the measurement ID lives (`G-XXXXXXXXXX`), which is
 * the thing a deploy or a tagging workflow actually needs out of GA4.
 */
const action: ActionDefinition = {
  key: "data-stream-list",
  type: "read",
  resource: "dataStream",
  title: "List data streams",
  description: "List a property's web, iOS and Android data streams.",
  params: [PROPERTY_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing GA4 data streams", { property, returnAll, limit });

    return await client.adminAll(
      `/properties/${encodeURIComponent(property)}/dataStreams`,
      "dataStreams",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
