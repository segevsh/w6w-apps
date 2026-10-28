import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Google Maps Platform reports no remaining headroom anywhere in a response.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "No Maps Platform response carries rate-limit headers. Verified 2026-08-18 by reading the " +
      "full response headers from both API generations: a Geocoding call returns " +
      "content-type, cache-control, vary and Google's security headers and nothing else, and a " +
      "Places call adds only server-timing. There is no X-RateLimit family, no Retry-After on a " +
      "success, and no usage field in any response body. What exists is per-API quota in the " +
      "Cloud console and usage in Cloud Monitoring — a different product, on a different " +
      "credential (a service account, not this API key), which an app-level health check has no " +
      "business holding. The signals that DO arrive in-band are failures rather than headroom: " +
      "the older web services answer OVER_QUERY_LIMIT with an HTTP 200, and the newer ones " +
      "answer 429. Both are surfaced by the actions with that explanation attached.",
  },
};

export default quota;
