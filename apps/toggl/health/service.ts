/**
 * Is Toggl up? — Atlassian Statuspage at status.toggl.com.
 *
 * Verified directly: `https://status.toggl.com/` is footed "Powered by
 * Atlassian Statuspage" (history.atom / history.rss feed links confirm it),
 * and `GET https://status.toggl.com/api/v2/summary.json` returns the
 * standard Statuspage shape — a top-level `status.indicator` plus a
 * `components` array, live-tested to include entries like "Track Webapp" and
 * "Track API".
 *
 *   - `kind: "service"` — is the vendor's platform up, distinct from "is this
 *     credential live" (the derived `auth:*` check) or "is there quota left"
 *     (`quota`).
 *   - `scope: "app"` (default for this kind) — one call, shared across every
 *     Connection; running it per Connection would multiply one call by the
 *     user count and risks getting rate-limited by the status page itself.
 *   - `credential: "none"` (default) — no Connection needed, so this reports
 *     even before anyone has connected.
 *   - `network.allow` — status.toggl.com is deliberately NOT on the app's
 *     egress allowlist; no action has business calling it. Widened for this
 *     one hook only, which the spec permits precisely because the posture is
 *     unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
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

const STATUS_HOST = "status.toggl.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Toggl platform status",
  description: "Atlassian Statuspage rollup for status.toggl.com, with per-component detail. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about Toggl, and reporting that as an outage would be a lie.
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
