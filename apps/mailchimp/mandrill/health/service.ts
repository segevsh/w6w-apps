/**
 * Is Mandrill up? — declared absent, honestly.
 *
 * Mailchimp Transactional's status page (status.mailchimp.com) is a
 * StatusCake-hosted page, not an Atlassian Statuspage instance like most
 * vendors in this pack — verified directly (2026-08-02): `GET
 * https://status.mailchimp.com/api/v2/summary.json` returns a plain Apache
 * 404 (there is no `/api/v2/*` surface at all), and none of the usual feed
 * paths exist either (`/rss`, `/history.rss`, `/feed` all 404). The page
 * itself is server-rendered HTML with no `<link rel="alternate" type=
 * "application/rss+xml">` and no visible API/RSS affordance in its markup.
 *
 * Per rfcs/healthcheck.md: "Say so when a vendor publishes nothing" — an
 * `unavailable` entry is a first-class answer, not an omission, and
 * `severity: "informational"` keeps a permanent `unknown` from pinning this
 * App's roll-up verdict (an `unavailable` entry always reports `unknown`,
 * which would otherwise cap every verdict there forever).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mailchimp Transactional platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.mailchimp.com publishes no machine-readable feed: it is a StatusCake-hosted HTML " +
      "page, not an Atlassian Statuspage — `/api/v2/summary.json` 404s (plain Apache 404, not a " +
      "JSON API), and no RSS/Atom feed exists at any of the usual paths (`/rss`, `/history.rss`, " +
      "`/feed`). Humans can still check https://status.mailchimp.com by hand.",
  },
};

export default service;
