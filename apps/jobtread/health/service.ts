/**
 * Is JobTread up? — declared absent, honestly.
 *
 * JobTread DOES publish a status page, `https://status.jobtread.com` — a real
 * GitHub Pages site backed by `github.com/jobtread/jobtread-status`, a
 * genuinely JobTread-owned org repo, not a decoy. But it is entirely static:
 * confirmed live (2026-09-15), the page is a hand-edited HTML banner
 * ("All Systems Operational" / a commented-out alternate "issues" state baked
 * into the markup, not driven by any API), `last-modified: Mon, 11 Aug 2025`
 * — untouched for over a year — and none of the usual machine-readable paths
 * exist (`/api/v2/summary.json`, `/history.atom`, `/history.rss`, `/index.json`
 * all 404). There is nothing here a check could poll and trust: reading the
 * static HTML for "Operational" would report on the LAST TIME SOMEONE EDITED
 * THE PAGE, not on JobTread's actual live status. Humans can still check
 * https://status.jobtread.com by hand.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "JobTread platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.jobtread.com is a genuinely JobTread-owned page (github.com/jobtread/jobtread-status) " +
      "but it is fully static — a hand-edited HTML banner, last modified 2025-08-11, with no " +
      "JSON/RSS/Atom feed at any of the usual paths (`/api/v2/summary.json`, `/history.atom`, " +
      "`/history.rss`, `/index.json` all 404). There is no live signal to poll.",
  },
};

export default service;
