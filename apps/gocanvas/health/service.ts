import type { HealthCheckDefinition, HealthFeedEntry } from "@w6w/types";

/**
 * Is GoCanvas up? - `status.gocanvas.com`, a real Honeybadger status page whose
 * title is "GoCanvas - Status" and whose Atom feed `incidents.atom` is titled
 * "GoCanvas - Incident History" (verified 2026-10-06; 200 `application/atom+xml`,
 * 20 entries, newest 2026-09-20). It has no JSON summary: `/api/v2/summary.json`
 * is a 404, and `gocanvas.statuspage.io` is the unclaimed 127,718-byte catch-all
 * that answers 200 for every path - not this vendor's page.
 *
 * ## Two things the feed makes you handle
 *
 * 1. **Regions.** One feed carries every region's incidents, prefixed `US - `,
 *    `EU - ` or `AU - ` (some, like "Issue with email deliveries", carry none and
 *    are global). This app's host, `www.gocanvas.com`, is the US platform, so an
 *    open `EU - ` or `AU - ` incident is not an outage for it and is ignored.
 * 2. **An entry is a log of updates, newest first.** The summary opens with the
 *    LATEST update - `Operational [Resolved]`, `Operational [Maintenance
 *    complete]`, `Degraded performance [In maintenance]`. The state word before
 *    the bracket is what decides open vs closed; `latest` already folds to one
 *    entry per incident.
 */

const OTHER_REGION = /^\s*(EU|AU)\b\s*[-:–]/i;

/** `2026-09-20 08:50:00 UTC Operational [ Resolved ] ...` -> `Operational`. */
const LATEST_STATE =
  /^\s*(?:\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?\s*(?:UTC)?\s*)?([A-Za-z][A-Za-z ]*?)\s*\[/;

const RESOLVED_WORDS = /\b(resolved|completed?|maintenance complete)\b/i;

export function isOpenIncident(e: Pick<HealthFeedEntry, "title" | "summary">): boolean {
  const summary = e.summary ?? "";
  const lead = LATEST_STATE.exec(summary)?.[1]?.trim();
  if (lead) return !/^operational$/i.test(lead);
  return !RESOLVED_WORDS.test(`${summary} ${e.title ?? ""}`);
}

export function isOtherRegion(e: Pick<HealthFeedEntry, "title">): boolean {
  return OTHER_REGION.test(e.title ?? "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "GoCanvas platform status",
  description:
    "Open incidents on GoCanvas's status feed (status.gocanvas.com). Incidents for the EU and AU " +
    "regions are ignored, because this app talks to the US platform. Unsigned; fetched and " +
    "parsed by the host.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.gocanvas.com/incidents.atom" },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a failing status feed says nothing about the vendor.
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "status feed unavailable" };
    }

    const open = feed.latest.filter((e) => !isOtherRegion(e) && isOpenIncident(e));
    if (open.length === 0) return { state: "ok", ttlSeconds: 60 };

    return {
      state: "degraded",
      message: open.map((e) => e.title).filter(Boolean).join("; "),
      ttlSeconds: 60,
    };
  },
};

export default service;
