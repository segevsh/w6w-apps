import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no probe-able quota signal exists — a positive fact, not an omission.
 *
 * Mem documents leaky-bucket limits (100 requests and 200 complexity tokens per
 * minute, 4,000 and 8,000 per day) and reports headroom in `X-RateLimit-*` /
 * `X-Complexity-*` headers, but only on responses to calls that already carry a
 * credential, and any probe would itself spend from those buckets. There is no
 * dedicated usage endpoint in the v2 reference.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Mem reports rate-limit headroom only in response headers of authenticated calls " +
      "and has no usage endpoint, so a probe would spend the quota it measures.",
  },
};

export default quota;
