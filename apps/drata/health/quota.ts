import type { HealthCheckDefinition } from "@w6w/types";

/**
 * A declared absence, at `informational` severity so the permanent `unknown` it
 * would otherwise report cannot pin the app's verdict.
 *
 * The developer portal's overview documents one ceiling: 500 requests per minute
 * **per IP address**. The OpenAPI document declares no 429 response and no
 * rate-limit header on any of its 145 paths, and the limit is per source IP —
 * shared by everything behind the same egress — so there is nothing per-key to
 * read headroom from.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Drata publishes no readable rate-limit headroom. Its developer portal states a ceiling of " +
      "500 requests per minute per IP address; the OpenAPI document declares no 429 response " +
      "and no X-RateLimit-* header on any path, and the budget is per source IP rather than per " +
      "API key, so no call can report what remains.",
  },
};

export default quota;
