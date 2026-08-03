/**
 * Is BambooHR up? — the vendor's status.io RSS feed.
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
 *     `sign` never runs, so this reports even before anyone has connected. The
 *     spec REQUIRES this posture for a feed-backed check: "A check declaring
 *     `feed` MUST have `credential` of `none` or `context` — never `signed`."
 *   - `feed` rather than a hand-rolled fetch — the host fetches and parses the
 *     RSS itself and hands the entries over as `input.feed`, so this app never
 *     reimplements a feed reader and therefore never reimplements one subtly
 *     wrong. The feed's host is allowlisted implicitly, which is why there is no
 *     `network.allow` here and why `status.bamboohr.com` is deliberately absent
 *     from the app's own egress allowlist — an action has no business calling it.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never
 *     hard-fails a target on its own.
 *
 * ## Verifying the status endpoint is real before trusting it
 *
 * A 200 is not proof of anything — a site with an HTML catch-all returns 200 for
 * every path, and one recent candidate in this pack passed a bogus-path check
 * while serving 127 KB of marketing HTML. So this was verified on BOTH axes on
 * 2026-08-03:
 *
 *   (a) **Bogus sibling path.** The real feed lives at
 *       `/pages/54f0de009d6f51e7140002b7/rss`. Mutating the page id to
 *       `...0002ff` — same host, same shape, same `/rss` suffix — returns
 *       **200 `text/html`, 434 bytes**, a dark-background `<title>Error</title>`
 *       stub. So the host does NOT serve the feed indiscriminately, and a 200
 *       alone would have been misleading.
 *
 *   (b) **Content-type and body inspection.** The real one returns
 *       **200 `application/rss+xml; charset=utf-8`, 12407 bytes**, opening
 *       `<?xml version="1.0"?><rss ...><channel><title><![CDATA[BambooHR]]></title>`
 *       `<description><![CDATA[Status Feed]]></description>` with a live
 *       `lastBuildDate` and real incident items ("Background Processing is
 *       Delayed", dated July 2026). That is a genuine, currently-maintained feed
 *       — not a stub and not marketing copy.
 *
 * The status page itself (`https://status.bamboohr.com/`, 200, 122 KB of HTML)
 * was also fingerprinted: it is a real status.io-hosted page whose meta
 * description is "Current system status. View active incidents or upcoming
 * maintenance", carrying per-component entries such as "app.bamboohr.com (US)"
 * with an "Operational" rollup. The status.io JSON API
 * (`https://api.status.io/1.0/status/54f0de009d6f51e7140002b7`) is live too and
 * returns a structured `status_overall`.
 *
 * ## Why the RFC feed, and not that JSON API
 *
 * The JSON API would give a cleaner current-state rollup. It is not used because
 * it lives on `api.status.io` — a THIRD host, unrelated to BambooHR, that would
 * have to be added to a `network.allow` and trusted to keep serving this
 * company's page id. The feed is on BambooHR's own status hostname, is the form
 * the spec has first-class support for, and is parsed by the host rather than by
 * this app. If a per-component breakdown is ever needed, revisit the trade — but
 * "one fewer third-party host, and no parser of our own" is the better default.
 *
 * ## Reading the feed correctly
 *
 * `latest`, not `entries`. A feed is a log of UPDATES, not a statement of
 * current state: status.io emits one item per update, so the newest item for a
 * long-resolved incident still carries that incident's original title. Judging
 * by it would report an outage that ended days ago. `latest` is the host's fold
 * to one entry per incident, which is the only view a verdict can be built from.
 */
import type { HealthCheckDefinition } from "@w6w/types";

/**
 * status.io marks a finished incident by moving it to a Resolved/Completed
 * state, which surfaces in the entry text. Anything still open is what matters.
 *
 * Matched against the summary AND the title because status.io is not consistent
 * about which carries the marker, and a missed "resolved" reads as a live
 * outage — the expensive direction to be wrong in.
 */
const RESOLVED = /\b(resolved|completed|monitoring)\b/i;

const service: HealthCheckDefinition = {
  key: "service",
  title: "BambooHR platform status",
  description:
    "Open incidents on BambooHR's status feed (status.bamboohr.com, hosted on status.io). " +
    "Unauthenticated and unsigned; fetched and parsed by the host.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.bamboohr.com/pages/54f0de009d6f51e7140002b7/rss" },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a status feed that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "status feed unavailable" };
    }

    const open = feed.latest.filter((e) => !RESOLVED.test(`${e.summary ?? ""} ${e.title ?? ""}`));
    if (open.length === 0) return { state: "ok", ttlSeconds: 60 };

    return {
      state: "degraded",
      message: open.map((e) => e.title).filter(Boolean).join("; "),
      ttlSeconds: 60,
    };
  },
};

export default service;
