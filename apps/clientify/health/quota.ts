/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * Clientify's published API reference (279 requests in the Postman collection) mentions no
 * rate limit, no `429`, no rate-limit header and no usage endpoint, and none of the
 * unauthenticated responses measured 2026-10-06 carried a rate-limit header.
 *
 * `severity: "informational"`: an `unavailable` entry always reports `unknown`, which would
 * otherwise pin the app's verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Clientify documents no rate limit, no rate-limit headers and no usage endpoint.",
  },
};

export default quota;
