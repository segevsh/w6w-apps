import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ringover documents one limit — 2 requests per second per API key, answered with 429 — and no
 * rate-limit headers, usage endpoint or plan quota in the reference (grepped for `ratelimit`,
 * `retry-after` and `X-Rate`: no hits). "How much is left" cannot be read, and a refusal is not
 * a reading, so this is a declared absence; `informational` keeps the permanent `unknown` from
 * pinning the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Ringover documents a fixed limit of 2 requests per second per API key and signals a " +
      "breach only with a 429; it publishes no rate-limit headers or usage endpoint, so " +
      "headroom cannot be read.",
  },
};

export default quota;
