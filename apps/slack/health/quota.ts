import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Slack exposes no headroom to read, so there is nothing to probe. Declared
 * rather than omitted, for the same reason as an absent status service: a host
 * should be able to tell "we cannot know" from "nobody looked".
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
      "Slack publishes no headroom endpoint or rate-limit headers. Limits are tiered per method and exhaustion surfaces as a 429 with `Retry-After`.",
  },
};

export default quota;
