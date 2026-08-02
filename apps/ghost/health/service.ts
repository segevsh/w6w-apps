/**
 * Is Ghost up? — the official Ghost status page, `ghoststatus.org`, powered by
 * incident.io and confirmed to publish a working RSS incident feed at
 * `/history.rss` (verified 2026-08-02: 9 items, most recent dated today).
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"`, `scope: "app"` (both defaults for this kind) — the
 *     answer is identical for every Connection, so the host runs it once and
 *     shares the result rather than hitting a status feed per Connection.
 *   - `credential: "none"` (default) — no Connection is supplied and `sign`
 *     never runs, so this reports even before anyone has connected.
 *   - **Caveat that makes this different from Shopify/Jira's `service`
 *     check:** `ghoststatus.org` covers Ghost.org and Ghost(Pro)-hosted sites
 *     (Websites, Admin, Analytics, Email delivery, Stripe API) — it says
 *     nothing about a self-hosted install, which is most of this App's
 *     addressable surface. `severity: "degraded"` (the kind's default) rather
 *     than fatal reflects that: an incident here is real signal for Ghost(Pro)
 *     tenants and irrelevant noise for self-hosted ones. The `site` check
 *     (`kind: "dependency"`) is what actually answers "is THIS tenant's site
 *     up", for either hosting model.
 *   - `feed` — the host fetches + parses; this hook only interprets. Read
 *     `latest`, not `entries`: a feed is a log of updates, and incident.io
 *     emits a new entry per status change, so the newest entry for a
 *     long-resolved incident still carries "Degraded" if judged by `entries`
 *     alone. The feed's host is allowlisted implicitly.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Ghost platform status",
  description: "Covers Ghost.org and Ghost(Pro)-hosted sites. Self-hosted installs are not " +
    "represented here — see the `site` check for those.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://ghoststatus.org/history.rss" },

  check({ feed }, _ctx) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) =>
      !/resolved|complete|operational/i.test(e.title)
    );
    return open.length === 0
      ? { state: "ok" }
      : { state: "degraded", message: open.map((e) => e.title).join("; ") };
  },
};

export default service;
