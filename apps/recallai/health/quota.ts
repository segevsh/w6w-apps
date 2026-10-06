import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Recall documents per-endpoint rate limits in prose ("60 requests per min per workspace" on
 * lists, 300 on reads and writes, 5 on usage and async transcripts) and signals a breach with a
 * 429 plus `Retry-After`; an empty ad-hoc bot pool is a 507 with the same header. No rate-limit
 * headers and no balance endpoint exist (`GET /billing/usage/` reports consumption, not headroom,
 * and is itself capped at 5 a minute), so "how much is left" cannot be read. A declared absence;
 * `informational` keeps the permanent `unknown` from pinning the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Recall.ai documents per-endpoint rate limits in prose and signals a breach only with a " +
      "429 and Retry-After; there are no rate-limit headers or remaining-balance endpoint, so " +
      "headroom cannot be read.",
  },
};

export default quota;
