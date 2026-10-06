import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "iClosed publishes rate limits (per account, per endpoint and verb, per 10-second window: " +
      "20 requests on Startup, 100 on Business) but returns no X-RateLimit-* or Retry-After " +
      "header on any response — an unsigned probe carries none — so remaining headroom is not " +
      "readable. The only signal is the 429 body {code: RATE_LIMIT_EXCEEDED, retryAfter, limit}, " +
      "which actions surface in their error message.",
  },
};

export default quota;
