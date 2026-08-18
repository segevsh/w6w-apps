import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Neither API publishes a remaining allowance.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "Neither surface reports remaining headroom. Verified 2026-08-18 against the Events API " +
      "hosts (events.1password.com and its regional siblings): no X-RateLimit family, no " +
      "Retry-After, and nothing in the response body. The Events API is documented as rate " +
      "limited and answers 429 when exceeded, but publishes no allowance to read in advance. " +
      "The Connect side has no vendor quota at all — it is a container you run, so its limits " +
      "are its own CPU and memory, and the thing that actually constrains it is how fast it can " +
      "sync from 1Password rather than how many requests it will take. What is worth watching on " +
      "a Connect server is not a quota but its reachability and its token's vault scope, which " +
      "the `surface` check covers.",
  },
};

export default quota;
