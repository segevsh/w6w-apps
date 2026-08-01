/**
 * Is Cal.com up? — status.cal.com, powered by openstatus.dev.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — answers "is the vendor's platform up", a different
 *     question from "is this credential live" (the derived `auth:*` check) or
 *     "is there quota left" (`quota`, declared unavailable below).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.cal.com is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, permitted because the posture is
 *     unsigned: a signed request must never reach a third-party status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * Verified live 2026-08-01: `GET https://status.cal.com/api/status/summary.json`
 * returns `{"page":{...},"status":{"indicator":"none","description":"All
 * Systems Operational"},"components":[{"name":"App","status":"operational"},
 * ...],"incidents":[],"scheduled_maintenances":[]}` — the `page` /
 * `incidents` / `scheduled_maintenances` keys are the Atlassian Statuspage
 * envelope verbatim, even though the page itself is served by openstatus.dev
 * rather than Atlassian. The live response observed carries only the healthy
 * values (`"none"` / `"operational"`); the rest of the map below is the
 * standard Statuspage indicator/component vocabulary (same as used for
 * Netlify, Cloudflare, SendGrid, ...) rather than a guess, since the schema
 * match makes it near-certain Cal.com's incidents use the same values —
 * confirm against a real incident if one is ever observed.
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

const STATUS_HOST = "status.cal.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Cal.com platform status",
  description:
    "status.cal.com summary API, with per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/status/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      if (!c.name) continue;
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
