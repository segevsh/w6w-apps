/**
 * Is Checkly up? — it does not publish a way to know.
 *
 * This is a declared absence with an unusual amount of evidence behind it,
 * because Checkly *appears* to publish two status surfaces and neither is
 * usable. Verified 2026-08-18:
 *
 * **1. `status.checklyhq.com` is a single-page app with a catch-all route.**
 * It answers `200 text/html` with the **same 257,163 bytes** for
 * `/api/v2/status.json`, `/api/v2/summary.json`, `/feed.xml`, `/rss`,
 * `/history.atom` and `/_nuxt/status.json` alike. Every path "exists"; none is
 * an endpoint. Its canonical address, `is.checkly.online`, serves the same
 * document.
 *
 * **2. `checkly.statuspage.io` is real Statuspage JSON, and abandoned.** It
 * answers proper 210-byte JSON with page id `nq8lf8mrmvw6` and thirteen
 * components — and its `updated_at` is **2026-04-28**, nearly four months
 * stale. Its `API` component is stuck at `partial_outage` while
 * `/incidents/unresolved.json` returns **zero** incidents. Wiring a check to it
 * would report `degraded` forever, off an incident nobody has closed since
 * April, on a page the vendor no longer links.
 *
 * A check that is confidently wrong is worse than no check, so this app ships
 * none and says why. If Checkly puts the JSON API back, this becomes a live
 * probe against the first surface.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Checkly platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Checkly publishes no machine-readable status. Verified 2026-08-18: status.checklyhq.com " +
      "(and its canonical is.checkly.online) is a single-page app that returns the identical " +
      "257,163-byte HTML document for every path including /api/v2/status.json and /feed.xml, " +
      "so no path there is an endpoint. The older checkly.statuspage.io instance does serve " +
      "real Statuspage JSON, but it was last updated 2026-04-28, its API component is stuck at " +
      "partial_outage, and it reports zero unresolved incidents — reading it would report a " +
      "permanent false outage.",
  },
};

export default service;
