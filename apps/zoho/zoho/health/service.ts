/**
 * Is Zoho CRM up? — Zoho's StatusIQ (Site24x7) status page.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is
 *     a different question from "is this credential live" (the derived
 *     `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection (this app only offers the US-DC OAuth flow, so every
 *     connection lives on the same status page), so the host runs it once and
 *     shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `feed`, not a hand-parsed fetch: `us.zohostatus.com` is a StatusIQ page
 *     that lists every Zoho product — Mail, Analytics, Bigin, CRM, ~100 more —
 *     as one RSS item per component, titled `"{component} - {status}"`. The
 *     host fetches and parses the feed; this hook only has to find the "Zoho
 *     CRM" component and read its status word off the title (there is no
 *     structured status field to parse instead — StatusIQ folds it into the
 *     title and description text).
 *   - `network.allow` — `us.zohostatus.com` is deliberately NOT on the app's
 *     egress allowlist; an Action has no business calling it. The spec
 *     permits widening it for this one hook precisely because the posture is
 *     unsigned.
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

/** Exact component name on the status page — "Zoho CRM", not "Zoho CRM Plus". */
const COMPONENT = "Zoho CRM";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Zoho CRM platform status",
  description:
    'Reads the "Zoho CRM" component off Zoho\'s StatusIQ RSS feed (us.zohostatus.com/rss). Unauthenticated and unsigned.',
  kind: "service",
  covers: ["*"],
  feed: { url: "https://us.zohostatus.com/rss" },
  minIntervalSeconds: 300,

  check({ feed }) {
    // `unknown`, never `down`: a feed that itself fails to fetch/parse tells
    // us nothing about the vendor, and reporting that as an outage would be a
    // lie.
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
