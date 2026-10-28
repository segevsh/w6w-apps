/**
 * Zoho Analytics publishes no per-response quota or rate-limit header for
 * this app to read.
 *
 * Checked 2026-09-29: `https://www.zoho.com/analytics/api/v2/
 * api-limits-pricing/api-units.html` documents a real per-plan daily "API
 * Units" budget (Free 1,000/day up to Enterprise 100,000/day) and a detailed
 * per-action-type unit cost table (e.g. Add Row = 0.1 unit, Update Row = 0.3
 * unit, importing 1,000 rows = 10-15 units) — but none of that is exposed as
 * a *response header* the way Zoho CRM's `X-API-CREDITS-REMAINING` is. A
 * live unauthenticated `GET /workspaces/owned` (and the same call with a
 * bad token, which answers `401 INVALID_OAUTHTOKEN`) carries no
 * `X-RateLimit-*` or similarly named header at all. There is nothing to
 * probe ahead of the eventual quota-exceeded error, so this is declared as
 * a positive absence rather than a silent gap — see
 * `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an
 * `unavailable` check always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up — at any other severity this would pin the whole App's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "Zoho Analytics documents a per-plan daily API-unit budget and a per-action unit cost " +
      "table, but exposes no X-RateLimit-* (or equivalent) response header to probe headroom " +
      "ahead of the eventual quota error (verified live 2026-09-29).",
  },
};

export default quota;
