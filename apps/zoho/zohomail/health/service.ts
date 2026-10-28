/**
 * Is Zoho Mail up? — Zoho's StatusIQ (Site24x7) status page.
 *
 * Verified 2026-08-15: `https://status.zoho.com/api/v2/summary.json`
 * redirects (301) to `https://us.zohostatus.com/api/v2/summary.json`, which
 * itself answers `404` — so Zoho does not run Atlassian Statuspage for this
 * product (this pack's `zoho` (Zoho CRM) app documents the same finding for
 * CRM). The real feed is `https://us.zohostatus.com/rss` — a Site24x7
 * StatusIQ page that
 * lists every Zoho product on one page, one RSS item per component, titled
 * `"{component} - {status}"`. Fetched live: the entry is exactly
 * `"Zoho Mail - Operational"` — distinct from the protocol-specific
 * `"Zoho Mail-IMAP"`, `"Zoho Mail-POP"` and `"Zoho Mail-SMTP"` components on
 * the same page, none of which cover the REST API this app calls.
 *
 * Annotation, and why each axis is what it is:
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:oauth2-<region>` checks) or "is there quota left"
 *     (`quota`, declared unavailable below).
 *   - `scope: "app"` (default for this kind) — the answer is the same
 *     regardless of which data centre a Connection lives in; Zoho publishes
 *     one status page across all of them.
 *   - `credential: "none"` (also the default) — reports even before anyone
 *     has connected.
 *   - `feed`, not a hand-parsed fetch: the host fetches and parses the RSS;
 *     this hook only finds the "Zoho Mail" component and reads its status
 *     word off the title — StatusIQ has no separate structured status field.
 *   - `us.zohostatus.com` is deliberately NOT on the app's `network.allow` —
 *     an Action has no business calling it. The spec permits widening it for
 *     this one hook because the posture is unsigned.
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

/** Exact component name on the status page — "Zoho Mail", not "Zoho Mail-IMAP"/"-POP"/"-SMTP". */
const COMPONENT = "Zoho Mail";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Zoho Mail platform status",
  description:
    'Reads the "Zoho Mail" component off Zoho\'s StatusIQ RSS feed (us.zohostatus.com/rss). ' +
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
