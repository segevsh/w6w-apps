/**
 * Is HighLevel up? — status.gohighlevel.com, a Better Stack ("Better Uptime")
 * page, not an Atlassian Statuspage instance.
 *
 * Annotation:
 *
 *   - `kind: "service"` — is the vendor's platform up, distinct from "is this
 *     credential live" (the derived `auth:oauth2` check) or "is there quota
 *     left" (`quota`).
 *   - `scope: "app"` (the default) — one shared answer for every Connection.
 *   - `credential: "none"` (the default) — reports even before anyone connects.
 *   - A Statuspage-compatible JSON API (`gohighlevel.statuspage.io`) also
 *     exists but was ruled out deliberately: its two components are both
 *     literally named "(example)" — an unused demo page, not what HighLevel
 *     operates. `status.gohighlevel.com` is the one linked from HighLevel's
 *     own site and support docs, so its feed is what this check reads.
 *   - No status/severity indicator field exists on this feed (unlike
 *     Statuspage's `status.indicator`), so the mapping is a title heuristic:
 *     `status.gohighlevel.com` publishes a paired "<X> went down" / "<X>
 *     recovered" entry per monitored component (sharing one id, so the host's
 *     `latest` fold already resolves the pair to whichever happened last),
 *     plus free-form incident narratives whose description says so once
 *     resolved. The whole-platform monitor ("gohighlevel.com went down") maps
 *     to `down`; every other open entry (a named feature: Social Planner,
 *     Voice AI, Forms, …) maps to `degraded`, since the feed gives no way to
 *     tell a partial disruption from a full outage of that one feature.
 */
import type { HealthCheckDefinition, HealthFeedEntry } from "@w6w/types";

const isResolved = (e: HealthFeedEntry): boolean =>
  /recovered$/i.test(e.title) || /\bresolved\b/i.test(e.summary);

const isPlatformDown = (e: HealthFeedEntry): boolean =>
  /^gohighlevel\.com went down$/i.test(e.title);

const service: HealthCheckDefinition = {
  key: "service",
  title: "HighLevel platform status",
  description: "status.gohighlevel.com incident feed. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.gohighlevel.com/feed.atom" },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) => !isResolved(e));
    if (open.length === 0) return { state: "ok", ttlSeconds: 60 };
    return {
      state: open.some(isPlatformDown) ? "down" : "degraded",
      message: open.map((e) => e.title).join("; "),
      ttlSeconds: 60,
    };
  },
};

export default service;
