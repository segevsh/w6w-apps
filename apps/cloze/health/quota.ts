import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota/rate-limit signal exists: a positive fact, not an omission.
 *
 * Checked on 2026-10-06: the OpenAPI document (version 2026.9) names no rate limit, no
 * `X-RateLimit-*` or `Retry-After` header and no usage endpoint, and the 401 responses
 * measured carry none. `severity: "informational"`, or the permanent `unknown` would pin the
 * app's verdict there.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Cloze's API reference documents no rate limit, rate-limit header or usage " +
      "endpoint, so there is no remaining-request signal to read.",
  },
};

export default quota;
