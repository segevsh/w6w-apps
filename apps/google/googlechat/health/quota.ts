import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Google Chat publishes its quota *ceilings* but exposes no headroom to read, so
 * there is nothing to probe. Declared rather than omitted: a host should be able
 * to tell "we cannot know" from "nobody looked".
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
      "Google publishes no headroom endpoint and no rate-limit response headers for the Chat API; quota is per-Cloud-project and visible only in the Google Cloud console. The documented ceilings (https://developers.google.com/workspace/chat/limits) are per-project per 60s — 3,000 message reads/writes, 3,000 space reads but only 60 space writes, 3,000 membership reads and 300 membership writes, 3,000 reaction reads and 600 reaction writes — layered over a per-space cap of 15 reads/s and just 1 write/s (5/s for reaction creation). Exhaustion surfaces as HTTP 429 with no remaining-quota field; Google's documented remedy is truncated exponential backoff.",
  },
};

export default quota;
