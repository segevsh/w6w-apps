/**
 * Is Redtail up? — Atlassian Statuspage.
 *
 * Verified live 2026-09-15: `https://status.redtailtechnology.com/api/v2/summary.json`
 * returns `page.name: "Redtail Technology"` (genuinely claimed — the page itself
 * also renders as a normal Statuspage HTML shell at the same host, not a
 * redirect to an unclaimed decoy) with a component named exactly `"Redtail API
 * (REST)"` — precisely the surface this app calls, distinct from sibling
 * components `"Redtail CRM"` (the web app), `"Redtail Imaging"`,
 * `"Redtail Email"`, `"Retriever Cloud"` and `"Retriever for Tailwag"`, none of
 * which this app touches.
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:*` check) or "is there quota left" (`quota`, declared
 *     unavailable below).
 *   - `scope: "app"` (this kind's default) — one page, shared by every
 *     Connection.
 *   - `credential: "none"` (also the default) — unsigned, reports even before
 *     any Connection exists.
 *   - `network.allow` widens egress to the status host for this hook only; it
 *     is deliberately absent from the app's own `crm.redtailtechnology.com`
 *     allowlist.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
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

const STATUS_HOST = "status.redtailtechnology.com";
const COMPONENT_NAME = "Redtail API (REST)";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Redtail platform status",
  description:
    "Atlassian Statuspage rollup for status.redtailtechnology.com, scoped to the 'Redtail API " +
    "(REST)' component — the sibling 'Redtail CRM'/'Redtail Imaging'/'Redtail Email'/'Retriever' " +
    "components are unrelated to this app. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about Redtail.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string }>;
    };

    const api = body.components?.find((c) => c.name === COMPONENT_NAME);
    const state = api
      ? (COMPONENT[api.status ?? ""] ?? "unknown")
      : (INDICATOR[body.status?.indicator ?? ""] ?? "unknown");

    return {
      state,
      message: body.status?.description,
      components: api ? { api: { state } } : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
