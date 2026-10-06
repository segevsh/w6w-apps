/**
 * Is the vendor up? — Document360 publishes a status page, but nothing a host can read.
 *
 * Checked 2026-10-06:
 *
 *  - `status.document360.com` is the real page (title "Document360 Status"; its incident history
 *    names "API Hub" and "API Hub - US"), but it is a server-rendered HTML page. Every machine
 *    path (`/api/v2/summary.json`, `/index.json`, `/history.atom`, and a nonsense path) answers
 *    the same `200 text/html` "Admin Labs - Status page disabled" shell. There is no JSON, Atom or
 *    RSS to declare, and scraping HTML is not something this app does.
 *  - `document360.statuspage.io` is a different thing: an abandoned Statuspage (last updated
 *    2022-02-18, a component literally named "Management Portal (example)"). It says nothing about
 *    today's API and is deliberately NOT used — a green read there would be fiction.
 *
 * So the vendor-status question is declared unavailable. The `api` reachability check and the
 * derived `auth:*` check are the automatable signals.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app at
 * `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Document360 platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.document360.com is HTML only (no JSON, Atom or RSS; every machine path " +
      "returns the same HTML shell), and the document360.statuspage.io page is abandoned. The " +
      "`api` reachability check and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
