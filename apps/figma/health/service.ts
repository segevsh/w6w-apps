/**
 * Is Figma up? — Atlassian Statuspage at status.figma.com.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is
 *     a different question from "is this credential live" (the derived
 *     `auth:*` checks).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.figma.com is deliberately NOT on the app's
 *     egress allowlist; no action has business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely
 *     because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * Verified 2026-07-31: `https://status.figma.com/api/v2/summary.json` is a
 * live Atlassian Statuspage endpoint returning
 * `{ status: { indicator }, components: [{ name, status }], ... }` — the
 * same shape used by every other Statuspage-hosted vendor in this pack.
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

const STATUS_HOST = "status.figma.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Figma platform status",
  description:
    "Atlassian Statuspage rollup for status.figma.com, with per-component detail. Unauthenticated and unsigned.",
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
