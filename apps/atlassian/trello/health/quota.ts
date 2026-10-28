import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Trello exposes no headroom to read, so there is nothing to probe. Declared
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
      "Trello publishes no headroom endpoint or rate-limit headers. The documented allowance is 300 requests per 10 seconds per key and 100 per 10 seconds per token, enforced by 429 rather than reported.",
  },
};

export default quota;
