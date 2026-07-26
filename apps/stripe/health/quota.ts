import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Stripe exposes no headroom to read, so there is nothing to probe. Declared
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
      "Stripe publishes no headroom endpoint or rate-limit header. The documented ceiling is roughly 100 read requests/second in live mode, enforced by 429; retryable failures carry `Stripe-Should-Retry`.",
  },
};

export default quota;
