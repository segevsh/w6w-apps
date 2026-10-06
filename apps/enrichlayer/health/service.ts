/**
 * Vendor status — status.enrichlayer.com is a self-hosted Cachet page (footer "Powered by
 * Cachet", checked 2026-10-06). The Statuspage and Better Stack paths (`/api/v2/summary.json`,
 * `/index.json`, `/history.atom`, `/rss`) all 404; Cachet's own `GET /api/v1/components`
 * answers JSON.
 *
 * The page lists one component per API endpoint ("Company API • Company Profile Endpoint")
 * plus "Web". Cachet component status: 1 operational, 2 performance issues, 3 partial
 * outage, 4 major outage. Individual endpoints can be down while the rest of the API is
 * fine, so the verdict is: every endpoint operational is ok; some impaired is degraded; the
 * API is `down` only when EVERY endpoint component reports a major outage.
 *
 * The page's top-level `/api/v1/status` is not used: it reads "Some systems are
 * experiencing issues" for a single slow endpoint.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const STATUS_HOST = "status.enrichlayer.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v1/components?per_page=100`;

interface CachetComponent {
  name?: string;
  status?: number;
  enabled?: boolean;
}

/** An endpoint component is named `<Group> API • <Name> Endpoint`; "Web" is the website. */
export const isEndpointComponent = (c: CachetComponent): boolean =>
  c.enabled !== false && /\sAPI\s•\s.+Endpoint$/.test(c.name ?? "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Enrich Layer platform status",
  description:
    "status.enrichlayer.com (Cachet /api/v1/components): one component per API endpoint. Any impaired endpoint is degraded; down only if every endpoint reports a major outage.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { data?: CachetComponent[] } | null;
    if (!Array.isArray(body?.data)) {
      return { state: "unknown", message: "status page did not return its component list" };
    }
    const endpoints = body.data.filter(isEndpointComponent);
    if (endpoints.length === 0) {
      return { state: "unknown", message: "status page names no API endpoint components" };
    }

    const impaired = endpoints.filter((c) => c.status !== 1);
    if (impaired.length === 0) return { state: "ok", ttlSeconds: 60 };
    const message = `impaired: ${impaired.map((c) => c.name).join("; ")}`;
    if (endpoints.every((c) => c.status === 4)) return { state: "down", message, ttlSeconds: 60 };
    return { state: "degraded", message, ttlSeconds: 60 };
  },
};

export default service;
