import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Google Tasks exposes no headroom to read, so there is nothing to probe.
 * Declared rather than omitted: a host should be able to tell "we cannot know"
 * from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no headroom endpoint or rate-limit headers for the Tasks API. Quota is per-project and visible only in the Google Cloud console; exhaustion surfaces as 429 `rateLimitExceeded` or 403 `userRateLimitExceeded`. The Tasks API also enforces per-user resource caps (20,000 non-hidden tasks per list, 100,000 tasks in total, 2,000 subtasks per task) that are likewise not readable over the API.",
  },
};

export default quota;
