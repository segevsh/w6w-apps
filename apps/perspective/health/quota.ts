import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Perspective limits the API to 100 requests per minute but exposes no usage " +
      "endpoint. RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset headers are documented " +
      "only 'when the rate limit is approaching or exceeded', so a healthy response carries " +
      "none, and a 429 body carries `retryAfter`. There is nothing to read in advance.",
  },
};

export default quota;
