/**
 * Is Constant Contact up? — the public status page's Statuspage-format
 * summary.
 *
 * The endpoint was verified genuine rather than assumed, because a Statuspage
 * URL shape is easy to fake with an HTML catch-all. On 2026-08-03:
 *
 *   - `GET /api/v2/summary.json`      → 200, `application/json`, 8,244 bytes,
 *                                       with a real `page.id` of `g83kktkx21mx`
 *                                       and 24 components;
 *   - `GET /api/v2/bogus-not-real.json` → 404, zero bytes.
 *
 * A catch-all would have answered both identically. It does not, so this is a
 * real Statuspage instance and not a marketing page wearing the URL.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also default) — nothing is signed, so this reports
 *     even before anyone has connected.
 *   - `network.allow` — `status.constantcontact.com` is deliberately NOT on the
 *     app's egress allowlist; no action has business calling it. The allowlist
 *     is widened for this one hook, which the spec permits precisely because
 *     the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * `summary.json` rather than `status.json`: one request either way, but the
 * summary carries the component breakdown. That matters here because Constant
 * Contact tracks "API's and Integrations" as a component distinct from
 * "Email Delivery", "Contact Management" and the rest of the marketing suite —
 * an outage of the campaign editor is not an outage of this app, and the
 * rollup indicator cannot tell the two apart.
 *
 * Two component names on this page are duplicated across different groups
 * ("Email Campaigns" appears twice), so slugging alone would silently drop
 * one. Duplicates are folded to their WORST state rather than last-wins — an
 * outage must not be overwritten by a healthy namesake.
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

/** Worst-first, so a fold can pick the more alarming of two readings. */
const RANK: Record<HealthState, number> = { down: 3, degraded: 2, unknown: 1, ok: 0 };

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.constantcontact.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Constant Contact platform status",
  description:
    'Statuspage-format rollup for status.constantcontact.com, with per-component detail including "API\'s and Integrations". Unauthenticated and unsigned.',
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
      const key = slug(c.name);
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      const seen = components[key]?.state;
      if (seen === undefined || RANK[state] > RANK[seen]) components[key] = { state };
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
