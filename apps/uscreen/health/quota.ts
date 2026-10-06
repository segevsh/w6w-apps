import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Quota headroom is a declared absence. Neither the Swagger document (v1.0.2) nor a live
 * response (measured 2026-10-06) carries a rate-limit header, a 429 definition or a usage
 * endpoint; the only pagination metadata is `Total-Count` and `Link`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Uscreen's Publisher API documents no rate limit: the Swagger document has no " +
      "429 response, no rate-limit header and no usage endpoint, and live responses carry " +
      "no X-RateLimit-* headers, so there is nothing to read ahead of a refusal.",
  },
};

export default quota;
