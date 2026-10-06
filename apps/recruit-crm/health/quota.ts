import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Quota headroom is a declared absence. The docs state 60 requests per minute per API token,
 * answered with HTTP 429 and an `X-RateLimit` header "returned with every response". An
 * UNSIGNED response does carry `x-ratelimit-limit/remaining/reset` (measured 2026-10-06), but
 * with `x-ratelimit-traffic-class: anonymous` and a limit of 30000 — not the documented
 * 60/min — so what a signed token's headers report could not be verified without a live key,
 * and there is no usage endpoint.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Recruit CRM documents 60 requests/minute per API token and an X-RateLimit header on " +
      "every response, but the only measured headers (unsigned) report a different, anonymous " +
      "traffic class (limit 30000), and the signed-token header values could not be verified " +
      "without a live key. There is no usage endpoint.",
  },
};

export default quota;
