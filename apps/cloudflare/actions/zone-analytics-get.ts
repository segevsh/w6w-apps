import type { ActionDefinition } from "@w6w/types";
import { cfGraphQL } from "../lib/client.ts";

/**
 * Get request/bandwidth/threat totals for a zone over a time range.
 *
 * Cloudflare's old REST endpoint for this, `GET /zones/{zone_id}/analytics/dashboard`,
 * is deprecated in favor of the GraphQL Analytics API — see
 * https://developers.cloudflare.com/analytics/graphql-api/migration-guides/zone-analytics/
 * — so this action queries `POST /graphql` instead, which shares this app's
 * host (`api.cloudflare.com`) and Bearer auth, just a different envelope
 * (`{ data, errors }` rather than `{ success, result }`; see `lib/client.ts`).
 *
 * `httpRequests1hGroups` (hourly buckets) is used with `dimensions` omitted,
 * which collapses the buckets into one totals row per Cloudflare's documented
 * "remove `datetimeFiveMinutes`/`datetime` from `dimensions` to get totals"
 * migration guidance.
 */
interface AnalyticsResponse {
  viewer?: {
    zones?: Array<{
      httpRequests1hGroups?: Array<{
        sum: {
          requests: number;
          bytes: number;
          cachedRequests: number;
          cachedBytes: number;
          threats: number;
        };
      }>;
    }>;
  };
}

const QUERY = `
  query ZoneAnalytics($zoneTag: string, $since: Time, $until: Time) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1hGroups(limit: 1, filter: { datetime_geq: $since, datetime_lt: $until }) {
          sum {
            requests
            bytes
            cachedRequests
            cachedBytes
            threats
          }
        }
      }
    }
  }
`;

const action: ActionDefinition = {
  key: "zone-analytics-get",
  type: "read",
  resource: "zone",
  title: "Get zone analytics",
  description: "Get request, bandwidth, cache and threat totals for a zone over a time range",
  params: [
    {
      key: "zoneId",
      label: "Zone ID",
      type: "string",
      required: true,
      default: "",
      hint: "The zone's ID",
    },
    {
      key: "since",
      label: "Since",
      type: "datetime",
      default: "",
      hint: "Start of the range (ISO 8601, UTC). Defaults to 24 hours ago.",
    },
    {
      key: "until",
      label: "Until",
      type: "datetime",
      default: "",
      hint: "End of the range (ISO 8601, UTC). Defaults to now.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const zoneId = String(p.zoneId ?? "").trim();
    if (!zoneId) throw new Error("`zoneId` is required");

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since = String(p.since ?? "").trim() || dayAgo.toISOString();
    const until = String(p.until ?? "").trim() || now.toISOString();

    ctx.log("info", "fetching Cloudflare zone analytics", { zoneId, since, until });

    const data = await cfGraphQL<AnalyticsResponse>(ctx, QUERY, {
      zoneTag: zoneId,
      since,
      until,
    });

    const row = data.viewer?.zones?.[0]?.httpRequests1hGroups?.[0];
    if (!row) {
      return {
        requests: 0,
        bytes: 0,
        cachedRequests: 0,
        cachedBytes: 0,
        threats: 0,
        since,
        until,
      };
    }
    return { ...row.sum, since, until };
  },
};

export default action;
