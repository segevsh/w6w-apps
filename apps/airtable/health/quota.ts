import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Airtable exposes no headroom to read, so there is nothing to probe. Declared
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
      "Airtable publishes no headroom endpoint and returns no rate-limit headers. It enforces 5 requests/second per base and answers 429 with a 30-second cool-off, so `Retry-After` on a rejected call is the only signal — and reading it requires making the call that gets rejected.",
  },
};

export default quota;
