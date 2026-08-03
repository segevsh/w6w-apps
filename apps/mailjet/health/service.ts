/**
 * Is Mailjet up? — a genuine, claimed Atlassian Statuspage.
 *
 * ## Verified two ways, because "returns 200" proves nothing
 *
 * A status host that answers every path with the same bytes is a catch-all, not
 * an API, and an unclaimed `*.statuspage.io` subdomain happily serves a ~127KB
 * Atlassian marketing page to anything that asks. Both checks were run against
 * `status.mailjet.com` on 2026-08-03:
 *
 *   1. **Bogus sibling path.** `GET /api/v2/wibble-not-real.json` → **HTTP 404,
 *      0 bytes, no content-type**. A catch-all would have returned the same body
 *      as the real path; this host routes.
 *   2. **Content-type and body.** `GET /api/v2/summary.json` → **HTTP 200,
 *      `application/json; charset=utf-8`, 4477 bytes**, opening
 *      `{"page":{"id":"wkf4h18hjr2r","name":"Mailjet",...}` with a real component
 *      array. JSON served for a `.json` path, a page id, and Mailjet's own name —
 *      i.e. a claimed page, not the generic Atlassian shell.
 *
 * The two together are what makes this trustworthy: (1) rules out a catch-all,
 * (2) rules out an HTML impostor and an unclaimed subdomain.
 *
 * ## Why `summary.json` over the alternatives
 *
 * `/api/v2/status.json` is one request too, but returns only the rollup
 * indicator. `summary.json` costs exactly the same round trip and additionally
 * carries the per-component array, so one probe can report `api`, `smtp` and the
 * app independently — which is the entire reason `HealthReport.components`
 * exists. Reporting a single boolean when the vendor publishes eight named
 * components throws away the attribution an operator needs to tell "Mailjet is
 * down" from "the part we don't use is down".
 *
 * An RSS/Atom feed also exists on Statuspage hosts, but a feed is a log of
 * incident *updates*, not a statement of current state (see rfcs/healthcheck.md
 * on exactly this trap). `summary.json` states the present, which is the
 * question.
 *
 * ## Annotation
 *
 *   - `kind: "service"` — "is the vendor up", which is a different question from
 *     credential liveness (the derived `auth:basic` check) and from quota.
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares it. Per-Connection would
 *     multiply one useful call by the user count and get us rate-limited by a
 *     status page.
 *   - `credential: "none"` (also the default) — no Connection needed, `sign`
 *     never runs, so this reports before anyone has connected.
 *   - `network.allow` — `status.mailjet.com` is deliberately NOT on the app's
 *     main egress allowlist; no action has business calling it. This widens
 *     egress for one unsigned probe only, which the spec permits precisely
 *     because the posture is unsigned: a signed request must never reach a
 *     third-party status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never
 *     hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.mailjet.com";

/**
 * Statuspage's four rollup indicators. `major`/`critical` map to `down` rather
 * than `degraded`; the roll-up caps the verdict at `degraded` anyway (severity
 * defaults to `degraded` for this kind), so the distinction is what an operator
 * sees, not what it gates.
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mailjet platform status",
  description: "Atlassian Statuspage rollup for status.mailjet.com, with per-component detail. " +
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
