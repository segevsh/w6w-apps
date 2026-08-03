/**
 * Is Close up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — answers "is the vendor's platform up", a different
 *     question from "is this credential live" (the derived `auth:*` check) or
 *     "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares it. Per-Connection would
 *     multiply one useful call by the number of users and is a good way to get
 *     rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.close.com is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is widened
 *     for this one hook, which the spec permits precisely because the posture is
 *     unsigned: a signed request must never reach a third-party status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Verifying the status endpoint is real before probing it
 *
 * A JSON-shaped path returning 200 is not proof of an API — a site with an HTML
 * catch-all returns 200 for everything, and probing it yields a permanently
 * cheerful check that means nothing. So the Statuspage path was tested against
 * deliberately bogus siblings on the same host (2026-08-03):
 *
 *   - `GET /api/v2/status.json`   -> 200, `application/json`, 227 bytes,
 *     `{"page":{"id":"8vgwlwbg3zbc","name":"Close",...},"status":{"indicator":"none",...}}`
 *   - `GET /api/v2/summary.json`  -> 200, `application/json`, 8640 bytes
 *   - `GET /api/v2/notareal.json` -> **404, zero bytes**
 *   - `GET /api/v2/statusz.json`  -> **404, zero bytes**
 *
 * Distinct real responses, hard 404s for invented siblings, and a genuine
 * Statuspage `page.id`. This is a real API, not a catch-all.
 *
 * `summary.json` rather than `status.json`: same single request, but it carries
 * the per-component breakdown as well as the rollup. That matters for a CRM
 * whose telephony, email sending and API are separately reported — a workflow
 * that only calls the REST API is unaffected by a calling outage, and a
 * component-level answer can say so instead of greying out the whole App.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Statuspage's four rollup indicators. `major` maps to `down` rather than
 * `degraded` — the roll-up caps it at `degraded` anyway (severity defaults to
 * `degraded` for kind `service`), so the distinction is what an operator sees.
 */
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

const STATUS_HOST = "status.close.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Close platform status",
  description: "Atlassian Statuspage rollup for status.close.com, with per-component detail. " +
    "Unauthenticated and unsigned.",
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
