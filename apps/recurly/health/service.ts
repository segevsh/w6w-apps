/**
 * Is Recurly up? — Atlassian Statuspage.
 *
 * `kind: "service"`, `scope: "app"` (this kind's default, so the host runs it
 * once and shares the result), `credential: "none"` (also the default, so it
 * reports even before anyone has connected). `status.recurly.com` is
 * deliberately NOT on the app's egress allowlist — the allowlist is widened
 * for this hook only, safe because the posture is unsigned: a signed request
 * must never reach a third-party status host.
 *
 * ## Verified real before being probed (2026-09-15)
 *
 * A JSON-shaped 200 is not proof of a real status API — an unclaimed vendor
 * subdomain can serve a cheerful catch-all page. Checked both ways:
 *
 *   - `GET /api/v2/definitely-not-real-xyz.json` -> **404, zero bytes**
 *   - `GET /api/v2/summary.json` -> 200, `application/json`, a genuine
 *     Statuspage payload with a page identity:
 *     `{"page":{"id":"01KHY9JHFMQYN9KK21NWN7NBMW","name":"Recurly",
 *     "url":"https://status.recurly.com/",...},
 *     "status":{"description":"All Systems Operational","indicator":"none"},
 *     "components":[]}`
 *   - `GET /api/v2/status.json` -> 200, same page identity, no `components` key
 *
 * A real Statuspage instance, not a catch-all. Its `components` array is
 * currently empty — Recurly reports only a page-level rollup, no
 * per-component breakdown — so this check reads `status.indicator` only; the
 * component-mapping code is kept in case that ever changes, the same shape
 * this pack's other Statuspage-backed checks use.
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

const STATUS_HOST = "status.recurly.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Recurly platform status",
  description: "Atlassian Statuspage rollup for status.recurly.com. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor.
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
      components: Object.keys(components).length > 0 ? components : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
