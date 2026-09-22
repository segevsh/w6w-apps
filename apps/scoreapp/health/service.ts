import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is ScoreApp up?
 *
 * ScoreApp publishes no independent status page. Checked live on 2026-09-22:
 *
 *  - `status.scoreapp.com` answers a `302` to `https://www.scoreapp.com/` — the
 *    marketing site, not a status host. There is nothing machine-readable to ask.
 *  - `scoreapp.statuspage.io` answers a `302` to `https://www.statuspage.io` —
 *    the unclaimed-Statuspage decoy this pack's other apps have already
 *    documented (AgencyZoom, Apollo, Aweber, …): the page was never claimed by
 *    ScoreApp and carries no component data.
 *  - No Instatus or Better Stack alias for "ScoreApp" was found either.
 *
 * This is a declared absence, not a gap — see `core/docs/build-a-w6w-app.md` on
 * health checks. `severity: "informational"` is load-bearing: an `unavailable`
 * entry always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at
 * any other severity this would pin the App's verdict at `unknown` forever.
 *
 * The derived `auth:api-key` check (from `../auth/api-key.ts`'s `test` hook,
 * `GET /scorecards?limit=1`) is the automatable signal for "is ScoreApp working"
 * for anyone holding a live key — and, unusually for this pack, the `rate-limit`
 * check reads a real headroom number from the same call.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "ScoreApp platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "ScoreApp publishes no status page: status.scoreapp.com 302s to www.scoreapp.com " +
      "(the marketing site), and scoreapp.statuspage.io is the unclaimed-Statuspage decoy (302 " +
      "to statuspage.io's own marketing page) — both checked live 2026-09-22, and no Instatus or " +
      "Better Stack alias was found either. The auth:api-key check (GET /scorecards?limit=1) is " +
      "the automatable signal.",
  },
};

export default service;
