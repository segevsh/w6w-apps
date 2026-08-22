/**
 * Is Miro up? — Atlassian-compatible Statuspage, read from `status.json`.
 *
 * **Why `status.json` and not `summary.json`, unlike every other app in this
 * pack.** The convention here is to prefer `summary.json` because it carries a
 * per-component breakdown for the same single request. Miro's does not:
 * verified 2026-08-18, its `summary.json` (214 bytes) returns
 * `"components": []` — an empty array, not a parse failure — and
 * `components.json` returns the 18-byte `{"components":[]}`. So the extra
 * payload buys nothing here, and the smaller document is the honest probe.
 *
 * The page is otherwise real, and distinct per path rather than one catch-all:
 *
 *   GET https://status.miro.com/api/v2/status.json  -> 200, 198 B, JSON
 *   GET https://status.miro.com/api/v2/summary.json -> 200, 214 B, JSON
 *       {"page":{"id":"01JGBY6SXZ5B7XAV0K4CFM96F0","name":"Miro",…},
 *        "status":{"description":"All Systems Operational","indicator":"none"}}
 *
 * No `components` are reported for the same reason they are not fetched — there
 * are none to report, and synthesising one from the rollup would be a fiction.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (the default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned,
 *     so it reports before anyone has connected.
 *   - `network.allow` — `status.miro.com` is not the API host and is
 *     deliberately absent from the app's own egress allowlist; widening it for
 *     this one hook is permitted because the posture is unsigned.
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

const STATUS_HOST = "status.miro.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Miro platform status",
  description:
    "Statuspage rollup for status.miro.com. Unauthenticated and unsigned. Miro publishes no " +
    "per-component breakdown, so only the rollup is reported.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/status.json`);
    // `unknown`, never `down`: a status page that itself fails says nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
    };

    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      ttlSeconds: 60,
    };
  },
};

export default service;
