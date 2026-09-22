import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is GoCardless up?
 *
 * ## The status page is real, and it moved
 *
 * `https://status.gocardless.com` is not a status page: it answers a **302** to
 * `https://www.gocardless-status.com/`, which is a genuine **incident.io**-hosted
 * page with distinct components and its own incident history (checked
 * 2026-09-22). incident.io publishes an RSS incident feed at `/history.rss`, so
 * this check declares that feed and lets the host do the fetching and parsing —
 * the App's job is only to say what an entry *means*.
 *
 * ## Why the feed, not an API and not a hand-rolled fetch
 *
 * Parse Atom/RSS is generic, fiddly and identical for every publisher, and the
 * host already does it (`HealthCheckDefinition.feed`). A check that fetched and
 * parsed the document itself would also have to be granted the status host in
 * its own `network.allow`; a declared `feed` is allowlisted implicitly and is
 * deliberately bound to an unsigned posture, so no status host can ever see a
 * GoCardless token. There is no `network` widening here on purpose.
 *
 * ## Reading `latest`, and matching the vendor's own `Status:` line
 *
 * A feed is a log of updates, not a statement of current state: incident.io
 * emits one entry per status change, so the newest entry for a long-resolved
 * incident still carries that incident's original title. `latest` is the host's
 * fold of those updates onto one entry per incident, which is what a verdict
 * should be read from.
 *
 * Each incident.io entry body opens with its own machine-written status line —
 * `<b>Status: Resolved</b>`, `<b>Status: Investigating</b>`,
 * `<b>Status: Identified</b>`, `<b>Status: Monitoring</b>`,
 * `<b>Status: Scheduled</b>` — so the check greps that leading `Status:` word in
 * `summary` (case-insensitively) rather than sniffing the human title for the
 * word "resolved". Anything that is not `resolved` is an open incident:
 * `investigating`, `identified`, `monitoring` and `scheduled` are all states in
 * which a caller should expect degradation.
 *
 * ## Severity
 *
 * Left at the `kind: "service"` default (`degraded`). GoCardless is SaaS-only —
 * both environments run on the infrastructure this page describes — so an
 * incident here is genuine evidence about every Connection this app holds.
 */
export const FEED_URL = "https://www.gocardless-status.com/history.rss";

/**
 * incident.io's own closing word for an incident, at the head of the entry body.
 *
 * The host hands `summary` as plain text with the markup already stripped, so
 * the entry body reads `Status: Resolved`. The regex tolerates a leading tag as
 * well, because a host that hands the body through with its markup intact would
 * otherwise silently classify every entry as open — an outage that never ends.
 * `\b` keeps `Resolved` from matching a word that merely starts with it.
 */
export const RESOLVED = /^\s*(?:<[^>]*>\s*)*status:\s*resolved\b/i;

const service: HealthCheckDefinition = {
  key: "service",
  title: "GoCardless platform status",
  description:
    "Incident status from GoCardless's own status page (status.gocardless.com redirects to " +
    "www.gocardless-status.com, an incident.io page), covering both the live and sandbox " +
    "environments.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  feed: { url: FEED_URL },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    // A status feed that could not be fetched says nothing about GoCardless.
    if (feed?.error) return { state: "unknown", message: feed.error };

    const open = (feed?.latest ?? []).filter((entry) => !RESOLVED.test(entry.summary ?? ""));
    return open.length === 0 ? { state: "ok", ttlSeconds: 60 } : {
      state: "degraded",
      message: open.map((entry) => entry.title).join("; "),
      ttlSeconds: 60,
    };
  },
};

export default service;
