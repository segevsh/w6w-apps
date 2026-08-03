/**
 * Is Smartsheet up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — `status.smartsheet.com` is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned: a signed request must never reach a third-party
 *     status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## The status endpoint is genuine, and both checks were run
 *
 * The failure mode this guards against is an unclaimed subdomain that answers
 * 200 with a vendor-agnostic marketing page. Two independent tests, 2026-08-03:
 *
 *  1. **Bogus sibling paths.** `GET /api/v2/bogus-not-real.json` and
 *     `GET /api/v2/summary-nope.json` on the same host both return **404** with
 *     a zero-byte body, while `/api/v2/summary.json` returns **200**. A catch-all
 *     marketing origin answers everything alike; this one does not.
 *  2. **Content type and body.** `summary.json` is `application/json;
 *     charset=utf-8`, 28,897 bytes, and its body opens
 *     `{"page":{"id":"tvv76p250rdk","name":"Smartsheet","url":"https://status.smartsheet.com"…}`
 *     followed by real Smartsheet component names — "Core Application", "Email
 *     Notifications", each with a Statuspage `status` vocabulary word. The
 *     sibling `/api/v2/status.json` independently returns
 *     `{"status":{"indicator":"none","description":"All Systems Operational"}}`.
 *     That is Statuspage's schema, populated with this vendor's own data — not
 *     HTML, and not somebody else's page.
 *
 * `summary.json` rather than `status.json`: same single request, but it carries
 * the per-component breakdown — one probe reporting many things, which is the
 * point of a report over a boolean.
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

const STATUS_HOST = "status.smartsheet.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Smartsheet platform status",
  description:
    "Atlassian Statuspage rollup for status.smartsheet.com, with per-component detail. " +
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
