/**
 * Is lemlist up? — the lempire status page, powered by Hyperping.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result. Running
 *     it per Connection would multiply one useful call by the number of users
 *     and is a good way to get rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — `status.lempire.com` is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned: a signed request must never reach a third-party
 *     status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Verifying this endpoint is real, not a parked page
 *
 * Two independent checks, both run on 2026-08-03, because a 200 alone proves
 * nothing:
 *
 *  1. **Bogus-sibling comparison.** `GET https://status.lempire.com/status.json`
 *     → **200**, `application/json`, 38 bytes. A deliberately invented sibling,
 *     `GET https://status.lempire.com/api/v2/bogus-zzz9.json` → **404**, as does
 *     `/definitely-not-a-real-path-zzz9`. So the host is not a catch-all that
 *     answers 200 to everything.
 *  2. **Content-type and body inspection.** The body is
 *     `{"indicator":"up","uptime":"100.000%"}` — real JSON of the documented
 *     shape, not HTML wearing a `.json` name.
 *
 * The page itself renders "lempire Status" and monitors six components —
 * **lemlist**, **lemlist API**, lemwarm, taplio.com, tweethunter.io and
 * lempire.com — so it genuinely covers this app's dependency. lempire is
 * lemlist's parent company.
 *
 * ## Two traps this deliberately avoids
 *
 * **`status.lemlist.com` is the wrong host.** It looks like the obvious choice
 * and it resolves, but every path 302s to `https://status.lempire.com/` — the
 * **root**, discarding the path. So `https://status.lemlist.com/status.json`
 * returns **200 with 162 KB of `text/html`**: the status page's HTML shell, not
 * status JSON. A check pointed there would parse HTML as JSON, fail, and report
 * `unknown` forever while looking like it worked. Confirmed with a no-follow
 * request: `HTTP/2 302, location: https://status.lempire.com/`.
 *
 * **`lemlist.statuspage.io` is not lemlist's.** It also answers 200, but
 * redirects to `https://www.atlassian.com/software/statuspage` — 127 KB of
 * marketing HTML for an unclaimed subdomain. lemlist does not use Atlassian
 * Statuspage at all, so none of the usual `/api/v2/summary.json` machinery
 * applies here.
 *
 * ## Why no per-component breakdown
 *
 * Hyperping's `status.json` is documented as exactly two fields — `indicator`
 * and `uptime` — and its own docs say so: "The endpoint only returns the two
 * fields shown above — no per-service arrays or detailed component breakdowns
 * are included in this basic JSON response." So this check reports one rolled-up
 * state and no `components` map, rather than inventing one.
 *
 * The consequence is stated rather than hidden: because the page covers all six
 * lempire products, an incident affecting only taplio still reads here as
 * `degraded` for lemlist. Over-reporting is the safe direction for a check whose
 * severity is advisory, but a reader should know that is what is happening.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Hyperping's rollup vocabulary, from its own status-page-JSON documentation,
 * in the priority order that page lists:
 *
 *   - `maintenance` — at least one service undergoing maintenance
 *   - `incident`    — one or more (but not all) services experiencing downtime
 *   - `outage`      — all services down or affected by incidents
 *   - `up`          — all services operational
 *
 * `incident` and `maintenance` map to `degraded` rather than `down`: neither
 * means lemlist specifically is unreachable, and this page speaks for six
 * products. Only `outage` — everything down — maps to `down`.
 */
const INDICATOR: Record<string, HealthState> = {
  up: "ok",
  maintenance: "degraded",
  incident: "degraded",
  outage: "down",
};

const STATUS_HOST = "status.lempire.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "lemlist platform status",
  description:
    "Hyperping rollup for status.lempire.com, lempire's status page — it monitors lemlist and the lemlist API alongside lemwarm, taplio and tweethunter. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/status.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      indicator?: string;
      uptime?: string;
    } | null;
    if (!body) return { state: "unknown", message: "status API returned an unparseable body" };

    const state = INDICATOR[body.indicator ?? ""] ?? "unknown";

    // `uptime` is Hyperping's 90-day average, not a statement about right now,
    // so it rides along as context and never influences `state`.
    const uptime = body.uptime && body.uptime !== "N/A"
      ? ` (${body.uptime} uptime over 90 days)`
      : "";

    return {
      state,
      message: state === "unknown"
        ? `unrecognised status indicator "${body.indicator}"`
        : `lempire status: ${body.indicator}${uptime}`,
      ttlSeconds: 60,
    };
  },
};

export default service;
