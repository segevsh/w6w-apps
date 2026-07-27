/**
 * What has happened to Slack lately? — the published incident feed.
 *
 * This is a companion to `service`, not a replacement for it. `service` reads
 * Slack's JSON status API, which is authoritative for what is broken RIGHT NOW.
 * This reads the Atom feed, which is the vendor's incident HISTORY — including
 * incidents that have already closed and so have vanished from `active_incidents`.
 *
 * That gap is the reason to run both. A workflow that failed twenty minutes ago
 * and works now correlates with an incident that resolved in between, and the
 * current-state API cannot tell you it ever happened. This check can.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — it speaks about the vendor's platform, like `service`.
 *   - `scope: "app"` (the default) — identical for every Connection, so the host
 *     runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection, no `sign`. The
 *     `feed` declaration requires an unsigned posture, because a status host is
 *     exactly the kind that must never see a credential.
 *   - `feed` — declared, not fetched here: the host fetches and parses it and
 *     hands the entries over as `input.feed`. The feed lives on
 *     `slack-status.com`, a DIFFERENT host from the `status.slack.com` that
 *     serves the JSON API and different again from the `slack.com` the app's
 *     actions call. Declaring it adds that host to this hook's allowlist
 *     implicitly, and to no other hook's.
 *   - `severity: "informational"` — load-bearing. History is context for a
 *     human, and an incident that already closed must never drag a roll-up
 *     verdict down; `service` owns the verdict.
 *
 * Slack publishes the same content as Atom (`/feed/atom`) and RSS
 * (`/feed/rss`). Atom is the one declared because its `<updated>` says when an
 * incident last CHANGED, where RSS's `<pubDate>` conflates that with when it
 * was first posted — and "changed lately" is the question being asked.
 */
import type { HealthCheckDefinition } from "@w6w/types";

/** How far back an entry still counts as "lately". */
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Slack titles its entries `Incident: …` or `Notice: …`. */
function isIncident(title: string): boolean {
  return /^\s*incident\b/i.test(title);
}

const incidents: HealthCheckDefinition = {
  key: "incidents",
  title: "Recent incident history",
  description:
    "Incidents Slack published in the last week, from its Atom feed. Context only — `service` is authoritative for current state, and this never affects a verdict.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  feed: { url: "https://slack-status.com/feed/atom", format: "atom" },
  minIntervalSeconds: 900,
  severity: "informational",

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a feed that itself fails says nothing about Slack.
    if (!feed) return { state: "unknown", message: "no feed supplied" };
    if (feed.error) return { state: "unknown", message: feed.error };
    if (feed.entries.length === 0) {
      return { state: "ok", message: "no entries in the status feed", ttlSeconds: 900 };
    }

    // `latest` folds successive updates to one incident down to its newest.
    // Slack's feed is history, so most entries are long closed.
    const cutoff = Date.now() - WINDOW_MS;
    const recent = feed.latest
      .filter((e) => isIncident(e.title))
      .filter((e) => (e.publishedAt ? Date.parse(e.publishedAt) : 0) >= cutoff);

    if (recent.length === 0) {
      return { state: "ok", message: "no incidents published in the last 7 days", ttlSeconds: 900 };
    }

    // `ok` with a message, not `degraded`: every one of these is history, and
    // anything still running is `service`'s to report from the live API.
    return {
      state: "ok",
      message: `${recent.length} incident${recent.length === 1 ? "" : "s"} in the last 7 days: ${
        recent.map((e) => e.title.replace(/^\s*incident:\s*/i, "")).join("; ")
      }`,
      ttlSeconds: 900,
    };
  },
};

export default incidents;
