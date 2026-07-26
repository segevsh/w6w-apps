import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Jira exposes no headroom to read, so there is nothing to probe. Declared
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
      "Atlassian applies dynamic, cost-based limits with no published headroom endpoint. `X-RateLimit-*` headers appear on some endpoints but not reliably, so there is nothing a probe can read for a stable answer; a 429 carries `Retry-After`.",
  },
};

export default quota;
