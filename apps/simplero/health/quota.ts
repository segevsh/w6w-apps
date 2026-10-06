import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Not exposed: Simplero's v2 OpenAPI document declares no 429 response and no rate-limit " +
    "header, the API description states no request limit, and a 401 answer carries no " +
    "rate-limit header.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Simplero documents no rate limit for API v2: the spec (822 operations) has no 429 " +
      "response and no X-RateLimit/Retry-After header, and the API description mentions only " +
      "pagination and the User-Agent. Headers on a 200 response could not be checked without a " +
      "live key.",
  },
};

export default quota;
