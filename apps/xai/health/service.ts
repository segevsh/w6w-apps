/**
 * Is xAI's API up? — status.x.ai publishes an RSS incident log at `/feed.xml`
 * (`<title>SpaceXAI System Status</title>`, "Incident history for xAI services."; verified
 * 2026-10-06 — the page itself answers 403 to a bare fetch, the feed answers 200 XML).
 *
 * It is a custom page, not Statuspage/Instatus, and there is no JSON summary — so the feed is
 * the only machine-readable surface. Every incident is emitted once PER AFFECTED COMPONENT,
 * with the component as a bracketed title prefix (`[Global (api.x.ai)]`, `[US (us.api.x.ai)]`,
 * `[grok.com]`, `[Grok (iOS)]`, ...). Only the two API prefixes are about this app: a
 * grok.com or iOS-app incident says nothing about `api.x.ai`, so the rest are ignored.
 *
 * Open/closed lives in the body, `Status: RESOLVED` — read via `latest` (one entry per
 * incident id), never `entries`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

/** Title prefixes of the components that cover the API. */
export const API_COMPONENT = /^\[(Global \(api\.x\.ai\)|US \(us\.api\.x\.ai\))\]/;

const service: HealthCheckDefinition = {
  key: "service",
  title: "xAI API status",
  description: "Reads status.x.ai's RSS incident feed for open incidents on the API components.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.x.ai/feed.xml" },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) =>
      API_COMPONENT.test(e.title) && !/status:\s*resolved/i.test(e.summary)
    );
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    const outage = open.some((e) => /severity:\s*outage/i.test(e.summary));
    return {
      state: outage ? "down" : "degraded",
      message: open.slice(0, 5).map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
