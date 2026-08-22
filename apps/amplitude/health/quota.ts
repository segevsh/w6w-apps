import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Amplitude publishes no remaining allowance anywhere in a response.
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
      "No Amplitude response carries rate-limit headers. Verified 2026-08-18 by reading the full " +
      "response headers from all four hosts (api2.amplitude.com, api.eu.amplitude.com, " +
      "amplitude.com, analytics.eu.amplitude.com): no X-RateLimit family, no Retry-After, and " +
      "nothing in any body reporting remaining allowance. Limits exist and differ by side. " +
      "INGEST is throttled per user and per device rather than per project — 30 events per " +
      "second each — and a 429 there names the throttled events by index, so it is a partial " +
      "failure rather than a refusal; `event-track` returns those indexes. QUERY is cost-based " +
      "rather than request-based: an expensive segmentation over a wide window consumes more of " +
      "the allowance than a narrow one, and the allowance is not published. What is measurable " +
      "and matters commercially is event volume, which is a billing question rather than a " +
      "health one and is visible in the Amplitude UI.",
  },
};

export default quota;
