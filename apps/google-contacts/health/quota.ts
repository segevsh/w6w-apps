import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The People API exposes no headroom to read, so there is nothing to probe.
 * Declared rather than omitted, for the same reason as the absent `service`
 * check: a host should be able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no headroom endpoint or rate-limit headers for the People API. Quota is per-Cloud-project, set and viewed only in the Google Cloud console (APIs & Services → People API → Quotas); exhaustion surfaces as 429 `rateLimitExceeded` or 403 `userRateLimitExceeded`.",
  },
};

export default quota;
