import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Meta publishes a machine-readable outage feed per product at metastatus.com,
 * and one of its products is literally "Graph API" — verified 2026-10-05 by
 * fetching it:
 *
 *   https://metastatus.com/outage-events-feed-graph-api.rss
 *     200 text/xml, RSS 2.0, <title>Graph API Status</title>, self-referencing
 *     atom:link, zero <item>s while no incident is open.
 *
 * The same site's JSON index (`/data/orgs.json`) lists `graph-api` and
 * `facebook-login` (one "Platform Status" service each) but NO Instagram API
 * component — its only Instagram products are Messaging, Boost and Shops — so
 * Graph API is the right surface for this app's `graph.facebook.com` calls.
 * (The page itself is a client-rendered SPA: every path that isn't a `/data/*`
 * or feed file answers the same 1,401-byte HTML shell with a 200, so the sibling
 * Facebook apps' "no JSON, no feed" reading was the SPA shell, not an absence.)
 *
 * The feed is scoped to open outage events (resolved ones are absent), so — like
 * the WhatsApp app's check on the same site — an entry's presence is read as
 * "Meta is reporting something about Graph API right now"; Meta's feed carries
 * no machine-readable severity to parse, so any open entry is `degraded` (never
 * `down`: an incident is not proof that every call fails).
 */
const FEED_URL = "https://metastatus.com/outage-events-feed-graph-api.rss";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Meta Graph API status",
  description: "Meta's own outage-events feed for the Graph API (metastatus.com).",
  kind: "service",
  covers: ["*"],
  feed: { url: FEED_URL, format: "rss" },
  minIntervalSeconds: 300,

  check({ feed }, _ctx) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = feed?.latest ?? [];
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
