import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Asana exposes no headroom to read, so there is nothing to probe. Declared
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
      "Asana publishes no headroom endpoint or rate-limit headers. Cost varies per endpoint and exhaustion surfaces only as a 429 with `Retry-After`, so headroom has to be budgeted from observed 429s rather than read.",
  },
};

export default quota;
