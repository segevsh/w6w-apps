/**
 * Is Jobber up? — Atlassian Statuspage at `www.jobberstatus.net`.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there budget left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result. Running it per
 *     Connection would multiply one useful call by the number of connected
 *     Jobber accounts, which is a good way to get rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — the status host is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is widened
 *     for this one hook, which the spec permits precisely because the posture is
 *     unsigned: a signed request must never reach a third-party status host.
 *   - `severity` is left at this kind's default, `degraded`. It stays there on
 *     purpose. The state this check reports is Statuspage's account-wide
 *     rollup, which is true for every Jobber tenant equally — there is nothing
 *     tenant-conditional about "Jobber Online is down", so demoting it to
 *     `informational` would hide a real, universal outage. (The per-component
 *     detail *is* partly tenant-conditional — not every account uses Jobber
 *     Payments or the QuickBooks Online integration — but components are
 *     reported as detail beside the verdict, never as the verdict.)
 *
 * `summary.json` rather than `status.json`: one request either way, but summary
 * carries the per-component breakdown — one probe reporting many things, which
 * is the point of a report over a boolean. Jobber lists the API separately from
 * the web app ("API & Mobile Application (Jobber App)"), so a workflow author
 * can be told the thing they actually depend on is fine while the marketing
 * site is not.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Statuspage's four rollup indicators. `major` maps to `down` rather than
 * `degraded` — the roll-up caps this check at `degraded` anyway (severity
 * defaults to `degraded` for kind `service`), so the distinction is purely what
 * an operator sees.
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

/**
 * Jobber's status page is NOT on a `*.statuspage.io` subdomain and NOT on a
 * `status.` subdomain of the product host — both of the shapes a reader would
 * guess. It is `www.jobberstatus.net`, a separate domain, which the page's own
 * `page.url` field confirms. See the README for the verification, including the
 * near miss that makes guessing dangerous here.
 */
const STATUS_HOST = "www.jobberstatus.net";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Jobber platform status",
  description:
    "Atlassian Statuspage rollup for www.jobberstatus.net, with per-component detail (Jobber Online, the API & mobile app, Jobber Payments, messaging, integrations). Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Jobber, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      page?: { name?: string };
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    // A 200 carrying the wrong document is not health. Statuspage always sends
    // `status.indicator`; an HTML catch-all or an error envelope will not, and
    // `INDICATOR[undefined] ?? "unknown"` would quietly report `unknown`
    // forever instead of saying the probe stopped working.
    if (typeof body.status?.indicator !== "string") {
      return { state: "unknown", message: "status API returned no rollup indicator" };
    }

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    return {
      state: INDICATOR[body.status.indicator] ?? "unknown",
      message: body.status.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
