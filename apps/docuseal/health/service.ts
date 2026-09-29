import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is DocuSeal up?
 *
 * DocuSeal publishes no independent status page. Checked live on 2026-09-29:
 *
 *  - `status.docuseal.com` does not resolve (DNS `NXDOMAIN`) — there is no
 *    host to even ask.
 *  - `docuseal.statuspage.io/api/v2/summary.json` answers a `302` to
 *    `https://www.statuspage.io` — the unclaimed-Statuspage decoy this pack's
 *    other apps have already documented (AgencyZoom, Apollo, Aweber, …): the
 *    page was never claimed by DocuSeal and carries no component data, so it
 *    is not "the API is covered by a real status page" — it is nothing.
 *  - `docuseal.instatus.com` answers `500`, not a page DocuSeal operates.
 *
 * This is a declared absence, not a gap — see `core/docs/build-a-w6w-app.md`
 * on health checks. `severity: "informational"` is load-bearing: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in a roll-up, so at any other severity this would pin the App's verdict at
 * `unknown` forever. The derived `auth:api-key` check (`GET /templates?limit=1`)
 * is the automatable signal for "is DocuSeal working" for anyone holding a
 * live key.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "DocuSeal platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "DocuSeal publishes no status page: status.docuseal.com does not resolve, and " +
      "docuseal.statuspage.io is the unclaimed-Statuspage decoy (302 to statuspage.io's own " +
      "marketing page) — both checked live 2026-09-29. The auth:api-key check " +
      "(GET /templates?limit=1) is the automatable signal.",
  },
};

export default service;
