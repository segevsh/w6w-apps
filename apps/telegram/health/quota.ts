import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Telegram exposes no headroom to read, so there is nothing to probe. Declared
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
      "Telegram publishes no headroom endpoint or headers. The documented allowance is roughly 30 messages/second overall and 20 per minute to one group; a 429 carries `parameters.retry_after` in the body rather than a header.",
  },
};

export default quota;
