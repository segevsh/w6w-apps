/**
 * Is Help Scout up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a
 *     different question from "is this credential live" (the derived
 *     `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical
 *     for every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.helpscout.com is deliberately NOT on the app's
 *     main egress allowlist (`api.helpscout.net`); an action has no business
 *     calling it. Widened for this one hook only, which the spec permits
 *     precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * Verified live: `https://status.helpscout.com/api/v2/summary.json` returns a
 * real Atlassian Statuspage payload (confirmed 2026-08-02) — Help Scout is
 * not one of the vendors (Freshdesk, Zendesk, PayPal) whose status page turns
 * out to be a human-only shell with no JSON API.
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

const STATUS_HOST = "status.helpscout.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Help Scout platform status",
  description:
    "Atlassian Statuspage rollup for status.helpscout.com, with per-component detail. Unauthenticated and unsigned.",
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
