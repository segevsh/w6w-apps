/**
 * Is Copper up? — Atlassian Statuspage.
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
 *     `sign` never runs, so this reports even before anyone has connected. That
 *     matters more than usual here: Copper's credential is three headers, and a
 *     status host must never see any of them.
 *   - `network.allow` — status.copper.com is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is widened
 *     for this one hook, which the spec permits precisely because the posture is
 *     unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Verifying the status endpoint is real before probing it
 *
 * A JSON-shaped path returning 200 is not proof of an API — a site with an HTML
 * catch-all returns 200 for everything, and probing it yields a permanently
 * cheerful check that means nothing. Two independent checks were run against
 * this host on 2026-08-03:
 *
 * **(a) Bogus siblings on the same host.**
 *
 *   - `GET /api/v2/status.json`     -> 200, `application/json`, 229 bytes
 *   - `GET /api/v2/summary.json`    -> 200, `application/json`, 5216 bytes
 *   - `GET /api/v2/components.json` -> 200, `application/json`, 5103 bytes
 *   - `GET /api/v2/notareal.json`   -> **404, zero bytes**
 *   - `GET /api/v2/statusz.json`    -> **404, zero bytes**
 *
 * **(b) Content-type and body inspection.** All three real paths answer
 * `application/json; charset=utf-8` with distinct sizes and genuinely different
 * payloads, and `status.json` carries a real Statuspage identity:
 *
 *     {"page":{"id":"htdm1sj52pny","name":"Copper",
 *              "url":"https://status.copper.com",
 *              "time_zone":"America/Los_Angeles", ...},
 *      "status":{"indicator":"none","description":"All Systems Operational"}}
 *
 * `summary.json` lists fifteen named components including **"Developer API"**,
 * "Rest API & Web Application", "Google Sync" and "Workflow Automation" — an
 * account-specific set no catch-all could fabricate.
 *
 * ### The near miss worth recording
 *
 * `https://copper.statuspage.io/` — the plausible-looking vendor-subdomain form
 * — is **not** Copper's status page. It answers 200 with 127 KB of
 * `text/html`, having redirected to `https://www.atlassian.com/software/statuspage`:
 * Atlassian's marketing site. It would pass a naive "did it 200?" test while
 * containing nothing about Copper at all. Only `status.copper.com` is used here.
 *
 * `summary.json` rather than `status.json`: same single request, but it carries
 * the per-component breakdown as well as the rollup. That matters for a CRM
 * whose Developer API, Google Sync and Workflow Automation are separately
 * reported — a workflow that only calls the REST API is unaffected by a Chrome
 * extension outage, and a component-level answer can say so instead of greying
 * out the whole App.
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

const STATUS_HOST = "status.copper.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Copper platform status",
  description: "Atlassian Statuspage rollup for status.copper.com, with per-component detail " +
    "(including the Developer API component this app actually calls). Unauthenticated and unsigned.",
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
