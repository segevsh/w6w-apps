import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Parseur up?
 *
 * Parseur publishes no independent, machine-readable status page. Checked
 * live on 2026-09-15:
 *
 *  - `status.parseur.com` does not resolve (DNS resolution times out — no
 *    host to even ask).
 *  - `parseur.statuspage.io` answers `200` but redirects to
 *    `https://www.atlassian.com/software/statuspage` — the unclaimed
 *    Statuspage decoy this pack has already documented for other vendors
 *    (Apollo, AgencyZoom, ...): the page was never claimed by Parseur.
 *  - `parseur.instatus.com` similarly resolves to Instatus's own marketing
 *    site, and `parseur.instatus.com/summary.json` answers `500`.
 *  - `https://parseur.com/status` answers a bare `404`.
 *  - `help.parseur.com` (the vendor's Zendesk-style help center) contains no
 *    link to a status page of any kind.
 *
 * This is a declared absence, not a gap — see `core/docs/build-a-w6w-app.md`
 * on health checks. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a roll-up, so at any other severity this would pin the App's verdict at
 * `unknown` forever. The derived `auth:api-key` check (from
 * `../auth/api-key.ts`'s `test` hook, `GET /`) is the automatable signal for
 * "is Parseur working" for anyone holding a live key.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Parseur platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Parseur publishes no status page: status.parseur.com does not resolve, " +
      "parseur.statuspage.io and parseur.instatus.com are both unclaimed decoys that resolve to " +
      "the vendor platforms' own marketing sites, and parseur.com/status 404s — all checked live " +
      "2026-09-15. The auth:api-key check (GET /) is the automatable signal.",
  },
};

export default service;
