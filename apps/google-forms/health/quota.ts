import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Google publishes the Forms API's quota *ceilings* (975 read / 450 expensive
 * read / 375 write requests per minute per project; 390 / 180 / 150 per user
 * per project) but exposes no counter for what has been consumed and returns no
 * rate-limit headers — the only signal is a 429 after the fact. So there is
 * nothing to probe. Declared rather than omitted, for the same reason as an
 * absent status feed: a host should be able to tell "we cannot know" from
 * "nobody looked".
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
      "Google publishes the Forms API's per-minute ceilings (975 read / 450 expensive read / 375 write per project; 390 / 180 / 150 per user) but no headroom endpoint and no rate-limit response headers. Consumption is visible only in the Google Cloud console; exhaustion surfaces as HTTP 429.",
  },
};

export default quota;
