/**
 * Do we have API headroom left? — declared absent, not guessed.
 *
 * beehiiv's OpenAPI document (798 KB, every `4xx`/`5xx` response schema
 * enumerated) declares a `429` response on every endpoint but documents no
 * `X-RateLimit-*`/`RateLimit-*` header, and a live probe against
 * `api.beehiiv.com` on 2026-09-29 (both an unauthenticated request and one
 * carrying a syntactically plausible but fake bearer token) returned neither
 * header on the resulting `401`. There is also no account-level
 * usage/quota/plan-limits endpoint documented anywhere in the spec — unlike
 * Apify's `/users/me/limits`, nothing here reads a ceiling in advance.
 *
 * `unavailable` is the honest answer per `rfcs/healthcheck.md` "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Not exposed: beehiiv's OpenAPI document names a 429 on every endpoint but documents no " +
    "rate-limit header or account-usage endpoint, and none was observed live.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "No rate-limit header or account-usage/quota endpoint is documented in beehiiv's API, and " +
      "none was observed on a live 401 response.",
  },
};

export default quota;
