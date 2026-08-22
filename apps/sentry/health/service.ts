/**
 * Is Sentry's SaaS up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` checks), "is there
 *     quota left" (`quota`), or "is this tenant's own install reachable"
 *     (`site`).
 *   - `scope: "app"` (the default) — the answer is identical for every
 *     Connection that points at Sentry's SaaS, so the host runs it once and
 *     shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned,
 *     so it reports even before anyone has connected.
 *   - `network.allow` — `status.sentry.io` is deliberately NOT on the app's own
 *     egress allowlist question: the app allows `"*"` for self-hosted installs,
 *     but this hook still declares the one host it needs, so the check keeps
 *     its narrow, unsigned posture regardless of what the app allows.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * Verified 2026-08-18: `https://status.sentry.io/api/v2/summary.json` returns a
 * real Statuspage payload (page id `t687h3m0nh65`, name "Sentry", 14,768 bytes
 * with the per-component breakdown) — not the catch-all HTML shell `sentry.io`
 * serves for unknown asset paths. `summary.json` over `status.json`: one
 * request either way, but it carries the per-component detail.
 *
 * **A self-hosted install is not covered by this.** status.sentry.io is
 * Sentry's own SaaS; a tenant running getsentry/self-hosted has its own
 * availability, which is what `./site.ts` probes. This check stays app-scoped
 * and advisory rather than pretending to answer for both.
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

const STATUS_HOST = "status.sentry.io";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Sentry platform status",
  description: "Atlassian Statuspage rollup for status.sentry.io, with per-component detail. " +
    "Unauthenticated and unsigned. Covers Sentry's SaaS only, not a self-hosted install.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails says nothing
    // about the vendor, and reporting that as an outage would be a lie.
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
