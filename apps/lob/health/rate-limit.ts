import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Lob publishes no readable quota or headroom endpoint, so this declares `unavailable` with a
 * reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity a declared absence would
 * pin every verdict at `unknown` forever.
 *
 * Verified in Lob's OpenAPI document (Rate Limiting section, `ratelimit-*` response headers) on
 * 2026-10-06: the limit is 150 requests per 5 seconds per key per endpoint (300 for
 * `POST /us_verifications` and `POST /us_autocompletions`), reported only as headers on the
 * response of a rate-limited endpoint call. There is no endpoint to ask "how much is left"
 * without spending a request on that very endpoint, and the one account-level number Lob
 * exposes (`GET /accounts`, the Lob Credits balance) is a prepaid-credit figure, not API
 * headroom.
 */
const rateLimit: HealthCheckDefinition = {
  key: "rate-limit",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Lob exposes rate-limit headroom only as response headers on the endpoint being called " +
      "(150 requests per 5 seconds per key per endpoint; 300 for US verification and " +
      "autocomplete) and a 429 rate_limit_exceeded once refused. There is no account-level " +
      "quota endpoint to read ahead of time; the Lob Credits balance is a prepaid-credit " +
      "figure, not API headroom.",
  },
};

export default rateLimit;
