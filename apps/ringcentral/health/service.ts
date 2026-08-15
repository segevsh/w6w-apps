import type { HealthCheckDefinition } from "@w6w/types";

/**
 * RingCentral's status page is real but not machine-readable, so this
 * declares `unavailable` rather than pretending to parse it.
 *
 * ## Checked three ways on 2026-08-15
 *
 * 1. **It is a genuine client-rendered dashboard, not a redirect or a parked
 *    page.** `https://status.ringcentral.com/` answers `200 text/html`,
 *    2,330 bytes — the task brief's own flag that a bare 200 proves nothing.
 *    The HTML is a Vue/Axios single-page app ("RC Service Status Dashboard")
 *    that fetches its data client-side from a *separate* host declared in its
 *    `content-security-policy`: `connect-src … https://statusapi.ext.ringcentral.com`.
 * 2. **It is not Atlassian Statuspage, Better Stack or Instatus.** None of the
 *    standard machine-readable paths those three providers serve exist on
 *    this host:
 *
 *    | Path                      | Status | Content-Type              |
 *    | -------------------------- | ------ | -------------------------- |
 *    | `/api/v2/status.json`      | 404    | `application/json`         |
 *    | `/api/v2/summary.json`     | 404    | `text/html; charset=UTF-8` |
 *    | `/history.atom`            | 404    | `text/html`                |
 *    | `/history.rss`             | 404    | `text/html`                |
 *    | `/index.json`              | 404    | `text/html`                |
 *
 * 3. **The backing API is undocumented and its guessed paths 404 too.**
 *    `statusapi.ext.ringcentral.com` (the CSP-declared data host) answers
 *    `404 text/html;charset=iso-8859-1` for `/`, `/api/v1/services`,
 *    `/v1/services`, `/services`, `/api/services` and `/status` — a bare
 *    Tomcat-style 404, not a documented API surface. The dashboard's bundled
 *    JS (`core-services.js`) is a minified Vue/Axios app with no published
 *    endpoint reference; reverse-engineering an undocumented private API from
 *    obfuscated JS is exactly the "inferred, not confirmed" shortcut the task
 *    brief rules out.
 *
 * So there is a real vendor status *page*, but no feed this app can read
 * safely. `severity: "informational"` is load-bearing: an `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity this would pin the app's verdict at `unknown` forever.
 * `health/api.ts` reports the one thing this app CAN verify unsigned — that
 * the platform API host itself is up.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "RingCentral platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.ringcentral.com is a real, live Vue/Axios dashboard (200, 2,330 bytes of HTML on " +
      "2026-08-15) but not a Statuspage/Better Stack/Instatus page — none of the standard " +
      "machine-readable paths exist (/api/v2/status.json, /api/v2/summary.json, /history.atom, " +
      "/history.rss all 404). It fetches its data from a separate, undocumented host " +
      "(statusapi.ext.ringcentral.com, declared in the page's own connect-src CSP) whose guessed " +
      "REST paths also 404 and which publishes no API reference. Platform reachability is " +
      "reported by the `api` check instead.",
  },
};

export default service;
