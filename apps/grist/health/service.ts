import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Grist Labs publishes no machine-readable status service, and for this App
 * there is no single platform a shared answer could speak for anyway. Both
 * halves are stated as a positive fact rather than left as an omission — a host
 * should be able to render "not knowable" instead of letting an operator
 * conclude the publisher forgot.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 * Informational checks never worsen a verdict; they are carried for display.
 *
 * ### What was checked, on 2026-08-03
 *
 * **`status.getgrist.com` is a wildcard, not a status page.** It answers, but
 * what answers is the Grist application itself — `*.getgrist.com` resolves to
 * the same Express server, which is exactly the catch-all trap:
 *
 *   GET https://status.getgrist.com/api/v2/summary.json
 *     → 404 application/json  {"error":"not found: /api/v2/summary.json"}
 *       with `x-powered-by: Express` and a `grist_sid_prod` cookie for
 *       `Domain=.getgrist.com` — Grist's own session cookie.
 *   GET https://status.getgrist.com/definitely-not-a-real-path-zzz
 *     → 404 text/html, 3953 bytes: the Grist single-page-app shell
 *       (`<base href="https://grist-static.com/…">`).
 *
 * A bogus sibling and a plausible one land on the same server, and neither is a
 * status API.
 *
 * **The `*.statuspage.io` forms are unclaimed.** `getgrist.statuspage.io`,
 * `grist.statuspage.io` and `gristlabs.statuspage.io` all answer **302 to
 * `https://www.statuspage.io`** — Atlassian's own marketing site, with the
 * requested path discarded. This is the known trap in its redirect form: a naive
 * "did it eventually 200?" test would sail straight through 127 KB of HTML that
 * says nothing about Grist.
 *
 * (`grist.statut.mte.incubateur.net` turns up in search results and is a real
 * status page — for one French public-sector *deployment* of Grist, not for
 * Grist Labs. It is somebody else's install and speaks for nobody but them.)
 *
 * ### Why nothing is substituted for it
 *
 * `https://docs.getgrist.com/status` is live and would make a tidy-looking
 * app-scoped `service` probe. It is not used as one, because a `service` check
 * is `scope: "app"` — one answer shared by every Connection — and this App's
 * Connections do not share a platform. Roughly half of them point at a
 * self-hosted grist-core on the tenant's own infrastructure, for whom Grist
 * Labs' hosted service being down is not news, and being up is a false
 * reassurance. The per-Connection question is the only one with a true answer,
 * and the `site` check asks it: the same `/status` endpoint, against the host
 * this Connection actually uses.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Grist platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Grist Labs runs no status service a machine can read: status.getgrist.com is a wildcard onto " +
      "the Grist app itself (a bogus sibling path returns the same SPA shell), and the getgrist / " +
      "grist / gristlabs statuspage.io subdomains are unclaimed and 302 to statuspage.io's marketing " +
      "site. Nor is there one platform to report on — a Grist connection may target the hosted " +
      "service or a self-hosted install, so the answerable question is per-connection. The `site` " +
      "check asks it against grist-core's own /status endpoint.",
  },
};

export default service;
