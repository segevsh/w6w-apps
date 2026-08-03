/**
 * No `quota` check — declared, not omitted.
 *
 * Constant Contact publishes hard allowances in prose: **4 requests per
 * second** and **10,000 requests per day** per API key, the daily counter
 * resetting at 00:00:00 UTC. What it does not publish is any way to read how
 * much of that is left.
 *
 * Verified on 2026-08-03, two ways:
 *
 *   1. The vendor's own OpenAPI document (`AppConnect V3`, info.version
 *      3.0.172, served at
 *      developer.constantcontact.com/api_reference/bundledWithSamples.yaml)
 *      declares no response `headers` anywhere — no `RateLimit-*`, no
 *      `X-RateLimit-*`, no `Retry-After`. The 429 responses carry a
 *      `description` and nothing else.
 *   2. The Rate Limits guide page documents the 429 by its **body** only:
 *      `{"error_key": "quota_exceeded", "error_message": "Limit Exceeded"}`
 *      for the daily cap and `{"error_key": "throttled", "error_message":
 *      "Too Many Requests"}` for the per-second one. It mentions no header at
 *      all, in either case.
 *
 * So there is nothing live to read. Reporting "9,999 of 10,000 remaining" from
 * the published constant would be inventing a number: the allowance is per
 * *API key*, and any other integration or environment sharing that key spends
 * from the same budget invisibly.
 *
 * Nor is there an account-level substitute. `/v3/contacts/counts` returns
 * contact *consent* counts, not a plan entitlement, and the `/v3/billing/*`
 * paths that would carry a plan limit are declared with empty bodies in the
 * vendor's own document — no operations, no schemas. The one real plan
 * endpoint, `/v3/partner/accounts/{id}/plan`, belongs to the Technology
 * Partner surface and is unreachable with a normal integration's token.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Constant Contact documents fixed allowances (4 requests/second and 10,000 requests/day per " +
      "API key, resetting at 00:00 UTC) but exposes no rate-limit response headers — its V3 " +
      "OpenAPI document declares no response headers at all, and the Rate Limits guide describes " +
      "the 429 purely by its `error_key` body (`throttled` / `quota_exceeded`). There is nothing " +
      "to read ahead of a 429, and no account-level plan endpoint to substitute: /contacts/counts " +
      "reports consent counts rather than an entitlement, and the /billing paths carry no " +
      "operations.",
  },
};

export default quota;
