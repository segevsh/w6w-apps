/**
 * No `service` check — declared, not omitted.
 *
 * **Flodesk publishes no status page.** This was established by probing, not
 * assumed, on 2026-08-03:
 *
 *   1. `status.flodesk.com` — **NXDOMAIN**. The host does not resolve at all.
 *   2. `status.flodesk.io` — **NXDOMAIN**.
 *   3. `flodesk.statuspage.io/api/v2/status.json` — answers **HTTP 200**, and
 *      this is exactly the trap worth documenting. The 200 is NOT a status API:
 *      the response is 127 KB of `text/html` whose `<title>` is
 *      *"Real-Time Incident Communication with Statuspage | Atlassian"*, because
 *      the request follows a cross-host redirect to
 *      `https://www.atlassian.com/software/statuspage`. The subdomain is
 *      unclaimed, and Atlassian sends unclaimed subdomains to its own marketing
 *      page. Anything parsing that as JSON gets `unknown` forever while looking
 *      like it is probing something real.
 *
 *      The control that caught it: a deliberately bogus sibling,
 *      `flodesk.statuspage.io/api/v2/bogus-not-real.json`, answers **404 with an
 *      empty body** — a *different* response, which at first glance argues the
 *      real path is genuine. It is the CONTENT TYPE that settles it. A real
 *      Statuspage v2 API answers `application/json` with a `page.name`; this
 *      answers `text/html` with an Atlassian sales pitch. Both checks matter.
 *   4. Flodesk's API description, its help centre and its own developer portal
 *      link to no status or uptime page anywhere.
 *
 * There is also no Atom/RSS feed to hand to `feed`, so the "declare a feed,
 * don't parse one" route is unavailable too.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up — so at any
 * other severity this declared absence would pin every Flodesk health verdict at
 * `unknown` permanently. Informational checks never worsen a verdict; they are
 * carried so an operator can see WHY there is no answer rather than wondering
 * whether someone forgot to write one.
 *
 * Note the contrast with `quota.ts` in this directory, which IS implemented:
 * Flodesk documents real rate-limit response headers even though it publishes no
 * status page. The two gaps are unrelated, and only one of them is a gap.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Flodesk platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Flodesk publishes no status page and no status feed. `status.flodesk.com` and " +
      "`status.flodesk.io` do not resolve (NXDOMAIN), and `flodesk.statuspage.io` is an " +
      "unclaimed Statuspage subdomain that redirects to Atlassian's marketing site — it " +
      "returns HTTP 200 with 127 KB of text/html, not a status API. Nothing machine-readable " +
      "exists to probe.",
  },
};

export default service;
