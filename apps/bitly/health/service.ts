/**
 * status.bitly.com is Atlassian Statuspage-powered and publishes an Atom feed
 * (`/history.atom`), so this is declared with `feed` rather than hand-parsed —
 * the host fetches and parses it, we only interpret what it means. See
 * rfcs/healthcheck.md "Feed-backed checks".
 *
 * Statuspage.io entries prefix each update's body with the status word
 * (`Resolved - …`, `Investigating - …`, `Monitoring - …`) rather than a
 * structured field, same convention as Coda's status.coda.io (also
 * Statuspage-powered) — so we read the newest update per incident (`latest`,
 * not `entries`) and treat anything not opening with "Resolved" as still open.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Bitly platform status",
  description: "Reads status.bitly.com's Atom history feed for open (non-Resolved) incidents.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.bitly.com/history.atom" },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) => !/^resolved\b/i.test(e.summary.trim()));
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.slice(0, 5).map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
