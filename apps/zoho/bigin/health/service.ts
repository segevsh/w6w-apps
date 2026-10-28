/**
 * Is Bigin up? — Zoho's StatusIQ (Site24x7) status page.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a
 *     different question from "is this credential live" (the derived
 *     `auth:oauth2` check) and from "is there credit left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every connection. Bigin's accounts spread across eight data centres, but
 *     Zoho publishes ONE component for the product, so there is nothing
 *     per-connection to say and the host may share one result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `feed`, not a hand-parsed fetch: `us.zohostatus.com` is a StatusIQ page
 *     that lists every Zoho product — ~100 of them — as one RSS item per
 *     component, titled `"{component} - {status}"`. The host fetches and parses
 *     the feed; this hook only has to find Bigin's component and read the status
 *     word off the title (there is no structured status field to parse instead,
 *     StatusIQ folds it into the title and description text).
 *   - **`COMPONENT` is the exact string `"Zoho Bigin"`.** Verified live
 *     2026-09-22: the feed carries both `"Zoho Bigin - Operational"` and
 *     `"Bigin Marketplace - Operational"`, two different products. An exact
 *     match (not a substring hunt for `Bigin`) is what keeps this check from
 *     reporting a marketplace outage as a Bigin API outage.
 *   - `network.allow` — `us.zohostatus.com` is deliberately NOT on the app's
 *     egress allowlist; an Action has no business calling it. The `feed` host is
 *     added to this hook's own allowlist implicitly, which is all it needs, and
 *     the check stays unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
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

/** Exact component name on the status page — not "Bigin Marketplace". */
const COMPONENT = "Zoho Bigin";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Bigin platform status",
  description:
    'Reads the "Zoho Bigin" component off Zoho\'s StatusIQ RSS feed (us.zohostatus.com/rss). Unauthenticated and unsigned.',
  kind: "service",
  covers: ["*"],
  feed: { url: "https://us.zohostatus.com/rss" },
  minIntervalSeconds: 300,

  check({ feed }) {
    // `unknown`, never `down`: a feed that itself fails to fetch/parse tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
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
