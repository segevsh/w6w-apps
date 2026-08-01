/**
 * Is LinkedIn's API up? — LinkedIn's own Atlassian Statuspage instance.
 *
 * Verified live 2026-07-26: `https://www.linkedin-apistatus.com/` is
 * LinkedIn's official developer API status page (footer credits "LinkedIn
 * Corporation", powered by Atlassian Statuspage), distinct from the generic
 * `linkedin-status.com` consumer-site tracker. `/api/v2/summary.json`
 * responded with the standard Statuspage shape (`status.indicator` /
 * `status.description` + a `components` array), unauthenticated.
 *
 * Annotation, mirroring the github/hubspot apps in this pack:
 *   - `kind: "service"` — "is the vendor's platform up", a different
 *     question from credential liveness (the derived `auth:*` checks) or
 *     quota (this app declares none — see `health/quota.ts`).
 *   - `scope: "app"` (default for this kind) — one result shared across
 *     every Connection; running it per Connection would multiply one call by
 *     the number of users and risks getting rate-limited by the status page.
 *   - `credential: "none"` (default) — no Connection needed, reports even
 *     before anyone has connected.
 *   - `network.allow` — status host widened for THIS hook only, deliberately
 *     kept off `w6w.network.allow`; no Action has business calling it.
 *   - `severity` defaults to `degraded` for this kind, so a LinkedIn incident
 *     never hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's four rollup indicators. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "www.linkedin-apistatus.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "LinkedIn API status",
  description:
    "Atlassian Statuspage rollup for www.linkedin-apistatus.com, LinkedIn's official API " +
    "status page, with per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
