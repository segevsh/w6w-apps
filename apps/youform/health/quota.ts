import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Youform publishes no rate-limit or quota signal: its API collection declares
 * none and `/api/me` carries no `X-RateLimit-*` headers (checked 2026-10-06).
 * Plan limits (submissions per month, the `is_complete=false` pro-only filter)
 * are enforced at the point of use and are not readable as headroom.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Youform publishes no rate-limit headers or quota endpoint; plan limits are enforced at " +
      "the point of use and cannot be read as headroom in advance.",
  },
};

export default quota;
