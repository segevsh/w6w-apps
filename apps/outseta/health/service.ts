/**
 * Is Outseta up?
 *
 * `status.outseta.com` answers 200 with a real page — title "No problems
 * detected. | Outseta Status" — but it is built on **Oh Dear** (`ohdear.app`),
 * not Statuspage/Instatus: `/api/v2/summary.json`, `/index.json` and
 * `/history.atom` all 404 with a small "Not a status page route" body
 * (measured 2026-10-06), and `outseta.statuspage.io` redirects to Atlassian's
 * marketing page (the unclaimed-page signature). The page's own footer links
 * `ohdear.app/status-page/outseta/subscribe-rss`, and Oh Dear publishes an RSS
 * incident feed at `/rss`, which answers 200 `application/xml` with a valid
 * channel and zero items.
 *
 * Declared as a `feed`, so the host fetches and parses it and this hook only
 * interprets entries. Because the feed has never carried an item, the shape of
 * an open incident's title is unobserved; the check treats an entry whose title
 * does not read as resolved/complete as open — the same convention the
 * lemonsqueezy app uses for the same platform.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const STATUS_FEED_URL = "https://status.outseta.com/rss";

export function isOpenIncident(title: string): boolean {
  return !/resolved|complete|operational|maintenance complete/i.test(title);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Outseta platform status",
  description:
    "Reads status.outseta.com's Oh Dear-powered RSS feed for open incidents. The feed has carried " +
    "no items, so the open/resolved title convention is a best reading rather than a confirmed one.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  feed: { url: STATUS_FEED_URL },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) => isOpenIncident(e.title));
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.slice(0, 5).map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
