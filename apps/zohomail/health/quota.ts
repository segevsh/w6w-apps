/**
 * Zoho Mail publishes no quota or rate-limit surface for this app to read.
 *
 * Checked 2026-08-15: the API documentation index
 * (`https://www.zoho.com/mail/help/api/`) links no rate-limit or credit
 * endpoint (unlike Zoho CRM's `X-API-CREDITS-REMAINING`), and a live
 * unauthenticated `GET https://mail.zoho.com/api/accounts` carries no
 * `X-RateLimit-*` (or similarly named) response header at all. There is
 * nothing to probe, so this is declared as a positive absence rather than
 * a silent gap — see `packages/apps/HEALTHCHECKS.md`.
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
    reason: "Zoho Mail's REST API documents no rate-limit or credit endpoint, and returns no " +
      "X-RateLimit-* (or equivalent) response header (verified live 2026-08-15).",
  },
};

export default quota;
