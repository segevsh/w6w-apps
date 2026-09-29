/**
 * Is Webex up? — the vendor's own status feed, but read narrowly.
 *
 * ## Finding a real feed, and why the JSON API isn't usable
 *
 * Checked on 2026-09-29. `https://status.webex.com` self-identifies as a
 * Statuspage-branded page (`<description>Statuspage</description>` on its own
 * RSS channel) but its `/api/v2/*.json` paths are **not real** — they all
 * answer `200 text/html`, the identical 463-byte SPA shell every unknown
 * route on that host serves (a client-rendered app, not a server API). The
 * SPA's own bundle calls a *different* host, `service-status.webex.com`, for
 * its live JSON — but that endpoint requires an `Authorization` header the
 * bundle sources from Webex's own SSO (`Hd.getAccessToken()`), so it is not a
 * public, unsigned API this check could call.
 *
 * What IS real and public: `/history.rss` (confirmed `200
 * application/rss+xml`, 96 KB, live incident and maintenance items dated
 * today) and a family of per-product feeds — `Webex_Calling.rss`,
 * `Webex_Meetings.rss`, `Webex_Contact_Center.rss`, `Webex_App.rss`,
 * `Collaboration_Control_Hub.rss` all confirmed live and distinct.
 *
 * ## No component covers this app's surface — hence `informational`
 *
 * This app calls the Messaging REST API (`webexapis.com/v1/{rooms,messages,
 * memberships,teams,team/memberships,webhooks,people}`), and none of the
 * per-product feeds above is scoped to it — Rooms/Messages/Teams are not
 * "Webex Calling", "Webex Meetings" or "Webex App" in this taxonomy. The
 * general `/history.rss` DOES occasionally carry a relevant entry — one
 * confirmed live item on 2026-09-29 was titled "Webex Services: Login
 * failures for the Webex API service in the APAC region" — but that same feed
 * is dominated by Contact Center, Calling, Meetings and Control Hub incidents
 * that have nothing to do with this app's calls. Cisco is many products on
 * one page; there is no isolated "Webex Messaging API" component to read
 * instead. So this is wired to the general feed for the occasional real
 * signal, but capped at `severity: "informational"` rather than the `kind:
 * "service"` default of `degraded` — a red state here is a hint to go look,
 * not a verdict on whether this app's own calls will succeed. The derived
 * `auth:oauth2` check is what actually verifies a connection works.
 *
 * `feed` rather than a hand-rolled fetch: the host fetches and parses the RSS
 * and hands over `input.feed`, so this app never reimplements a feed reader.
 * `feed.latest`, not `feed.entries` — Statuspage's classic history feed folds
 * each incident's full update timeline into one item (newest update first),
 * so a resolved incident still carries "resolved"/"completed"/"monitoring"
 * somewhere in that one item's text; `latest` is the host's fold to one entry
 * per incident, confirmed against live items on 2026-09-29 (e.g. a completed
 * maintenance item literally contains the string "completed").
 */
import type { HealthCheckDefinition } from "@w6w/types";

/** Statuspage's closed-state vocabulary, matched the same way as this pack's other status.io/Statuspage feeds. */
const RESOLVED = /\b(resolved|completed|monitoring)\b/i;

const service: HealthCheckDefinition = {
  key: "service",
  title: "Webex platform status",
  description:
    "Open incidents/maintenance on status.webex.com's general history feed. Covers all Webex " +
    "products on one page — no component is scoped to just the Messaging REST API this app " +
    "calls — so this is informational context, not a verdict on webexapis.com. Unauthenticated " +
    "and unsigned; fetched and parsed by the host.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  feed: { url: "https://status.webex.com/history.rss" },
  minIntervalSeconds: 60,

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a status feed that itself fails tells us nothing
    // about Webex, and reporting that as an outage would be a lie.
    if (!feed || feed.error) {
      return { state: "unknown", message: feed?.error ?? "status feed unavailable" };
    }

    const open = feed.latest.filter((e) => !RESOLVED.test(`${e.summary ?? ""} ${e.title ?? ""}`));
    if (open.length === 0) return { state: "ok", ttlSeconds: 60 };

    return {
      state: "degraded",
      message: open.map((e) => e.title).filter(Boolean).join("; "),
      ttlSeconds: 60,
    };
  },
};

export default service;
