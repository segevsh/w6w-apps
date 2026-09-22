import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Google Meet exposes no headroom to read, so there is nothing to probe. Declared
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
      "Google publishes no Meet-specific headroom endpoint or rate-limit headers. Quota is per-project, metered in the Cloud console and shared with every other Google Workspace API the project enables; exhaustion surfaces as 429 `RESOURCE_EXHAUSTED` or 403 `PERMISSION_DENIED` rather than a readable balance.",
  },
};

export default quota;
