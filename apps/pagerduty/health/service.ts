/**
 * Is PagerDuty up? — declared absent, honestly.
 *
 * status.pagerduty.com exists and is linked from PagerDuty's own support
 * docs, but it is PagerDuty's own "Status Pages" product (self-hosted, not
 * Atlassian Statuspage): the payload it serves is a client-rendered SPA
 * shell with the incident data embedded in an inline `<script id="data">`
 * blob, not a separate documented endpoint. Verified 2026-07-31:
 *
 *   - `/api/v2/status.json` and `/api/v2/summary.json` (the standard
 *     Statuspage paths) both 404.
 *   - Every other path tried (`/index.json`, `/incidents.json`,
 *     `/history.atom`, `/history.rss`, `/feed`) returns HTTP 200 with the
 *     IDENTICAL HTML SPA shell — a catch-all route, not real endpoints.
 *   - The legacy `pagerduty.statuspage.io` host (PagerDuty's status page
 *     before they built their own product) returns 401, i.e. it is not a
 *     public, unauthenticated source either.
 *
 * Parsing the inline JSON embedded in the HTML would mean depending on an
 * undocumented, unstable internal shape (it is versioned by a
 * `pdt-layout-version` cookie/header that changes with PagerDuty's own
 * frontend deploys) — exactly the kind of guess the healthcheck RFC says not
 * to make ("declare a feed; don't parse one", and there is no feed here to
 * declare). So this check is declared unavailable rather than invented.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "PagerDuty platform status",
  description:
    "No machine-readable status API, Atom, or RSS feed is published for status.pagerduty.com.",
  kind: "service",
  severity: "informational",
  unavailable: {
    reason:
      "status.pagerduty.com is a client-rendered SPA (PagerDuty's own Status Pages product) with " +
      "no documented JSON/Atom/RSS endpoint — verified 2026-07-31, see the standard Statuspage " +
      "paths (404) and every other path tried (same HTML shell, not real endpoints).",
  },
};

export default service;
