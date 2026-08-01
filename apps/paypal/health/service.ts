/**
 * Is PayPal up? — https://www.paypal-status.com
 *
 * PayPal's status page is a JS single-page app: `/api/production` and the
 * usual Atlassian-Statuspage-style `summary.json`/`status.json` paths all
 * return the HTML shell, not JSON — there is no machine-readable status API
 * to poll. It DOES publish genuine Atom/RSS feeds (linked from the page's own
 * `<head>`, confirmed by fetching them directly):
 *
 *   https://www.paypal-status.com/feed/atom
 *   https://www.paypal-status.com/feed/rss
 *
 * so this is a feed-backed check, not a JSON-API one — the host fetches and
 * parses it, and hands over `input.feed` (see rfcs/healthcheck.md).
 *
 * Each feed entry is one incident (verified: 10 consecutive items, 10 distinct
 * ids), and its title is a live status prefix — "Resolved: …",
 * "Initial Notification: …", "Postponed: …", "Rescheduled: …" — not a
 * fixed vocabulary PayPal documents anywhere, so this reads only the one
 * signal that's unambiguous: whether the newest update for an incident
 * starts with "Resolved". Everything else (an open incident, a maintenance
 * notice not yet resolved) counts as "open" — the same conservative
 * interpretation the healthcheck RFC's own Mistral example uses for a vendor
 * that doesn't publish a clean status enum.
 *
 * Annotation, and why each axis is what it is:
 *   - `kind: "service"` / `scope: "app"` / `credential: "none"` — the usual
 *     defaults for a vendor status probe: one call, shared across every
 *     Connection, runs even before anyone has connected.
 *   - No `network.allow` here: a feed's host is allowlisted implicitly (same
 *     footing as an OAuth endpoint host), so restating it would be redundant.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "PayPal platform status",
  description:
    "PayPal's status feed (paypal-status.com), read for open (non-Resolved) incidents. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://www.paypal-status.com/feed/atom" },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) => !/^resolved:/i.test(e.title));
    return open.length === 0 ? { state: "ok", ttlSeconds: 60 } : {
      state: "degraded",
      message: open.map((e) => e.title).join("; "),
      ttlSeconds: 60,
    };
  },
};

export default service;
