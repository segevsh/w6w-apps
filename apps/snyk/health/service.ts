/**
 * Is Snyk up? — Atlassian Statuspage.
 *
 * Verified 2026-08-18: `https://status.snyk.io/api/v2/summary.json` returns a
 * real Statuspage payload (page id `myj6w6kw42c6`, name "Snyk", 39,448 bytes)
 * whose components are Snyk's **regional deployments** — `SNYK-US-01`,
 * `SNYK-EU-01` and the rest. `status.json` returns a distinct 207-byte
 * document, so these are real endpoints rather than one catch-all.
 *
 * `summary.json` over `status.json`: one request either way, and the
 * per-component breakdown is what tells an operator whether the incident is in
 * their region.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (the default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned.
 *   - `network.allow` — `status.snyk.io` is not the API host and is
 *     deliberately absent from the app's own egress allowlist.
 *   - `severity` defaults to `degraded` for this kind.
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

const STATUS_HOST = "status.snyk.io";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Snyk platform status",
  description:
    "Atlassian Statuspage rollup for status.snyk.io, with per-region component detail. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails says nothing
    // about the vendor.
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
