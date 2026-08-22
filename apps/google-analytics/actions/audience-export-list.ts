import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { LIST_PARAMS, PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/audienceExports` — verified against
 * Google's Data API discovery document
 * (`analyticsdata.properties.audienceExports.list`).
 *
 * Each entry carries a `state` (`CREATING` / `ACTIVE` / `FAILED`), which is how
 * a workflow knows an export started by `audience-export-create` is ready to
 * query. This is a Data API list, so it pages with the same `pageToken`
 * contract the Admin lists use.
 */
const action: ActionDefinition = {
  key: "audience-export-list",
  type: "read",
  resource: "audienceExport",
  title: "List audience exports",
  description: "List a property's audience exports and their build state.",
  params: [PROPERTY_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const path = `/properties/${encodeURIComponent(property)}/audienceExports`;

    ctx.log("info", "listing GA4 audience exports", { property, returnAll, limit });

    // Data API host, Admin-style paging: collected by hand rather than through
    // `adminAll`, which is bound to the Admin host.
    const items: unknown[] = [];
    let pageToken: string | undefined;
    while (items.length < (returnAll ? Infinity : limit)) {
      const page = await client.data<{
        audienceExports?: unknown[];
        nextPageToken?: string;
      }>(path, { query: { pageSize: 200, pageToken } });
      const chunk = page?.audienceExports ?? [];
      items.push(...chunk);
      pageToken = page?.nextPageToken;
      if (!pageToken || chunk.length === 0) break;
    }
    return returnAll ? items : items.slice(0, limit);
  },
};

export default action;
