/**
 * Zoho Creator publishes no per-response quota or rate-limit header for this app to
 * read.
 *
 * Checked 2026-09-29: `things-to-know.html` documents a real "Developer API" daily
 * call budget ("subject to your subscription... refer to the Developer API's count
 * shown in the Billing section of your Creator account") and a per-minute request
 * cap ("API requests are limited to 50 per minute, per API endpoint, per public IP
 * address" — also codified as error `2955`, `429 Too Many Requests`, in
 * `status-codes.html`) — but neither is exposed as a *response header* the way Zoho
 * CRM's `X-API-CREDITS-REMAINING` is. A live unauthenticated `GET
 * /creator/v2/meta/applications` (and the same call with a bad token) carries no
 * `X-RateLimit-*` or similarly named header at all. There is nothing to probe ahead
 * of the eventual quota/rate-limit error, so this is declared as a positive absence
 * rather than a silent gap — see `packages/apps/HEALTHCHECKS.md`.
 *
 * `severity: "informational"` is required here, not a style choice: an
 * `unavailable` check always reports `unknown`, and `unknown` outranks `ok` in the
 * roll-up — at any other severity this would pin the whole App's verdict at
 * `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Zoho Creator documents a per-subscription daily Developer API call budget and a " +
      "50-calls/min-per-endpoint-per-IP cap, but exposes no X-RateLimit-* (or equivalent) " +
      "response header to probe headroom ahead of the eventual quota/rate-limit error " +
      "(verified live 2026-09-29).",
  },
};

export default quota;
