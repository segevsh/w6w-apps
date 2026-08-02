/**
 * Is Clearbit up? — Atlassian Statuspage.
 *
 * `status.clearbit.com` is a live Atlassian Statuspage instance — confirmed
 * 2026-08-01: `GET https://status.clearbit.com/api/v2/summary.json` returns
 * `200` with a real `{page, components, ...}` payload (`page.name ===
 * "Clearbit"`), unauthenticated. It is unaffected by the HubSpot acquisition
 * housekeeping (dashboard/docs/free-tier changes) — it is Clearbit's own,
 * separately-hosted status page and still reports on the classic API surface
 * this app calls.
 *
 * - `kind: "service"` / `scope: "app"` (default) — one shared answer per App,
 *   not per Connection; running it per-connection would multiply one call by
 *   every user and risks getting rate-limited by the status page itself.
 * - `credential: "none"` (default) — no Connection required; reports even
 *   before anyone has connected.
 * - `network.allow` — `status.clearbit.com` is deliberately NOT on the app's
 *   main egress allowlist (no Action has business calling it); this hook
 *   widens egress for its own worker only, which is safe precisely because
 *   the posture is unsigned.
 * - `severity` defaults to `degraded` for this kind, so a vendor incident
 *   never hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.clearbit.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Clearbit platform status",
  description:
    "Atlassian Statuspage rollup for status.clearbit.com, with per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
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
