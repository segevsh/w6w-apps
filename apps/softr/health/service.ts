import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Softr up?
 *
 * ## No machine-readable status feed exists — checked three ways, 2026-09-15
 *
 * Softr publishes a human status page at `status.softr.io` (HTTP 200, ~34KB of
 * client-rendered HTML — a genuine SPA, not a parked domain), but it exposes
 * none of the machine-readable shapes this pack knows how to read:
 *
 * | Path                          | Status | Notes                              |
 * | ------------------------------ | ------ | ----------------------------------- |
 * | `/api/v2/summary.json`         | 404    | Not an Atlassian Statuspage         |
 * | `/summary.json` / `/index.json` | 404   | Not Instatus / Better Stack         |
 * | `/history.atom` / `/history.rss` | 404  | No Atom/RSS feed                    |
 *
 * `softr.statuspage.io` — the obvious guess for an unmigrated legacy page —
 * 302-redirects to statuspage.io's own marketing site, the signature of an
 * **unclaimed** Statuspage subdomain, confirming it is not where Softr
 * actually publishes.
 *
 * Declared `unavailable` rather than silently omitted, per this pack's
 * convention: a vendor that publishes nothing machine-readable is a fact worth
 * stating, not a gap to leave implicit.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in a health roll-up, so at any
 * other severity a declared absence would pin this app's verdict at `unknown`
 * forever.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Softr platform status",
  kind: "service",
  scope: "app",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.softr.io serves a client-rendered page with no JSON/Atom/RSS feed at any of " +
      "the standard vendor paths (Statuspage, Instatus, Better Stack all answer 404), and the " +
      "obvious statuspage.io fallback (softr.statuspage.io) is an unclaimed page that redirects " +
      "to statuspage.io's own marketing site rather than to a Softr-operated one.",
  },
};

export default service;
