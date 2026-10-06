/**
 * Is CoinGecko up?
 *
 * `status.coingecko.com` is a StatusHQ page, not an Atlassian Statuspage: the
 * `/api/v2/summary.json`, `/api/v2/status.json`, `/feed.rss`, `/index.json` and
 * `/summary.json` paths all 404 (HTML), measured 2026-10-06. The only machine-readable
 * surface is `/history.atom` (Atom, titled "CoinGecko Status - Incident History"), so the
 * host folds it and this check reads open incidents from `latest`. The page has no
 * per-component state, so the verdict is "any open incident" -> degraded, never down.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "CoinGecko platform status",
  description:
    "Reads status.coingecko.com's Atom incident history for open (unresolved) incidents.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  feed: { url: "https://status.coingecko.com/history.atom" },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter(
      (e) => !/\b(resolved|completed)\b/i.test(`${e.summary ?? ""} ${e.title ?? ""}`),
    );
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.slice(0, 5).map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
