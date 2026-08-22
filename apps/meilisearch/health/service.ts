/**
 * Is Meilisearch **Cloud** up? — read from its status feed.
 *
 * Two things shape this check, and the second is why it uses the pack's
 * feed mechanism rather than fetching JSON.
 *
 * **It only speaks for Cloud.** A self-hosted instance is not covered by any
 * vendor status page, which is what `instance` is for. This check is scoped
 * `component:cloud` rather than `*` so it cannot make a self-hosted connection
 * look broken because Meilisearch's hosted platform had an incident.
 *
 * **The status page has no JSON API.** Verified 2026-08-18,
 * `status.meilisearch.com` is a Better Stack page that serves the same
 * 1,084,319-byte HTML document for `/api/v2/status.json`,
 * `/api/v2/summary.json` and `/history.atom` alike — a single-page app with a
 * catch-all route, so every path "200s" and none of them is an endpoint. What
 * *is* real is `/feed.rss`: `application/rss+xml`, 46KB, titled "Incidents |
 * Meilisearch Cloud".
 *
 * So this is a **feed-backed check**. The host fetches and parses the RSS
 * before the hook runs and hands the entries over as `input.feed`, which is
 * exactly the split that mechanism exists for: parsing RSS is generic, while
 * deciding what an entry means is vendor-specific.
 *
 *   - `severity: "informational"` — a Cloud incident is real, but this app is
 *     equally often pointed at a self-hosted server, and an incident feed
 *     cannot tell which. `instance` is the check that speaks for *this*
 *     connection, and it is the one allowed to move the verdict.
 */
import type { HealthCheckDefinition, HealthFeedEntry } from "@w6w/types";

const STATUS_HOST = "status.meilisearch.com";

/**
 * Better Stack titles a resolved incident with the word, so a feed entry alone
 * does not mean an open incident. Anything whose latest update says resolved,
 * completed or closed is history.
 */
const CLOSED = /\b(resolved|completed|closed|post-?mortem)\b/i;

/** Only entries from the last day are treated as possibly still open. */
const RECENT_MS = 24 * 60 * 60 * 1000;

function isOpen(entry: HealthFeedEntry, now: number): boolean {
  if (CLOSED.test(entry.title) || CLOSED.test(entry.summary)) return false;
  if (!entry.publishedAt) return false;
  const at = Date.parse(entry.publishedAt);
  return Number.isFinite(at) && now - at < RECENT_MS;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Meilisearch Cloud status",
  description:
    "Open incidents on Meilisearch Cloud's status feed. Speaks only for Cloud — a self-hosted " +
    "instance is covered by the `instance` check instead.",
  kind: "service",
  // Deliberately not `*`: this says nothing about a self-hosted server.
  covers: ["component:cloud"],
  severity: "informational",
  feed: { url: `https://${STATUS_HOST}/feed.rss`, format: "rss", limit: 25 },
  minIntervalSeconds: 300,

  check(input, _ctx) {
    const feed = input.feed;
    // A feed that could not be fetched says nothing about Meilisearch.
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "no feed was supplied" };
    }
    const now = Date.parse(feed.fetchedAt);
    const reference = Number.isFinite(now) ? now : 0;

    // `latest` folds successive updates onto the incident they describe, which
    // is what makes "is it still open" answerable from a log of updates.
    const open = feed.latest.filter((entry) => isOpen(entry, reference));
    if (open.length === 0) {
      return { state: "ok", message: "no open Cloud incident", ttlSeconds: 300 };
    }
    return {
      state: "degraded",
      message: open.map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
