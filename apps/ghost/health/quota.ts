import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ghost's Admin API publishes no rate-limit or usage headers, and imposes no
 * documented per-key quota — declared rather than omitted, for the same
 * reason WordPress and Contentful's absent-quota checks are: a host should be
 * able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Ghost's Admin API documents no rate limit and returns no usage headers to read one from. " +
      "A self-hosted site additionally imposes whatever limits its own host does.",
  },
};

export default quota;
