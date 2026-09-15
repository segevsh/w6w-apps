/**
 * Is BoldSign up for **this connection's region**? — Atlassian Statuspage,
 * `status.boldsign.com`.
 *
 * Verified live 2026-09-15:
 *
 * ```
 * GET status.boldsign.com/api/v2/summary.json -> 200 application/json
 *   page: { "id": "rx5v6pj4nfhl", "name": "BoldSign", "url": "https://status.boldsign.com" }
 * ```
 *
 * The page names a component per region, and each component's `description`
 * is literally the API hostname it covers — `api.boldsign.com`,
 * `api-eu.boldsign.com`, `api-ca.boldsign.com`, `api-au.boldsign.com` — so
 * this check matches on `description` rather than parsing a display name
 * ("API (Europe)" vs. "API (Global)" vs. an eventual rename), and reads the
 * region straight off `lib/client.ts`'s `apiHostFrom`.
 *
 * `scope: "connection"` and `credential: "context"`, the same shape this
 * pack's `cloudinary` app uses for its own per-datacenter status page: the
 * region is part of the credential (it picks the API host), so a check that
 * watched every region and hedged toward the worst would misreport three
 * connections out of four whenever any one region has trouble.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { apiHostFrom } from "../lib/client.ts";

const STATUS_HOST = "status.boldsign.com";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

/** Statuspage's four rollup indicators — used only as a fallback. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

interface Component {
  name?: string;
  description?: string | null;
  status?: string;
  group?: boolean;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "BoldSign regional API status",
  description:
    "Atlassian Statuspage for status.boldsign.com, narrowed to this connection's region's API " +
    "component. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const host = apiHostFrom(ctx.connection);

    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Component[];
    };

    const api = (body.components ?? []).find(
      (c) => c.group !== true && (c.description ?? "").toLowerCase() === host.toLowerCase(),
    );
    if (!api) {
      const rollup = INDICATOR[body.status?.indicator ?? ""] ?? "unknown";
      return {
        state: rollup,
        message: body.status?.description ??
          `no component described as ${host} on status.boldsign.com; reporting the page-wide rollup`,
        ttlSeconds: 60,
      };
    }

    const state = COMPONENT[api.status ?? ""] ?? "unknown";
    return {
      state,
      message: `${api.name ?? host}: ${api.status ?? "unknown"}` +
        (body.status?.description ? ` · page-wide: ${body.status.description}` : ""),
      components: { api: { state } },
      ttlSeconds: 60,
    };
  },
};

export default service;
