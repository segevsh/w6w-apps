/**
 * Is Zoho Projects up? — Zoho's StatusIQ (Site24x7) status page.
 *
 * Verified live 2026-10-06: `https://us.zohostatus.com/rss` is the StatusIQ page that lists
 * every Zoho product as one RSS item per component, titled `"{component} - {status}"`. The
 * feed carries exactly one entry titled `"Zoho Projects - Operational"`, distinct from the
 * umbrella entries and from other Zoho products. Same feed the pack's other `zoho-*` apps use.
 *
 *   - `kind: "service"`, `scope: "app"`, `credential: "none"` (defaults) — one status page
 *     covers every data centre and reports before anyone has connected.
 *   - `feed`: the host fetches and parses the RSS; this hook reads the status word off the
 *     title. `us.zohostatus.com` is deliberately NOT on `network.allow`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** StatusIQ's component status vocabulary. */
const STATUS: Record<string, HealthState> = {
  "operational": "ok",
  "under maintenance": "degraded",
  "degraded performance": "degraded",
  "partial outage": "degraded",
  "major outage": "down",
};

/** Exact component name on the status page — "Zoho Projects". */
const COMPONENT = "Zoho Projects";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Zoho Projects platform status",
  description:
    'Reads the "Zoho Projects" component off Zoho\'s StatusIQ RSS feed (us.zohostatus.com/rss). ' +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://us.zohostatus.com/rss" },
  minIntervalSeconds: 300,

  check({ feed }) {
    // `unknown`, never `down`: a feed that itself fails to fetch/parse tells
    // us nothing about the vendor, and reporting that as an outage would lie.
    if (feed?.error) return { state: "unknown", message: feed.error };

    const entry = (feed?.latest ?? []).find((e) => {
      const [name] = e.title.split(" - ");
      return name.trim() === COMPONENT;
    });
    if (!entry) {
      return {
        state: "unknown",
        message: `feed carried no "${COMPONENT}" component — StatusIQ may have renamed it`,
      };
    }

    const status = entry.title.slice(entry.title.indexOf(" - ") + 3).trim().toLowerCase();
    return {
      state: STATUS[status] ?? "unknown",
      message: entry.title,
      ttlSeconds: 300,
    };
  },
};

export default service;
