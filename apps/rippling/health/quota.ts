/**
 * Request headroom — declared absent, not guessed.
 *
 * Rippling's limits (api-limits page, read 2026-10-05) are a 300-request burst
 * threshold in a sliding 10-second window — exceeding it rejects EVERY request
 * for the next 10 seconds — plus page-size, filter and expand-depth ceilings.
 * Nothing documents a rate-limit-remaining header or a usage endpoint, and the
 * limit is a penalty window rather than a budget, so there is no number to read
 * before hitting it. `informational`, so the permanent `unknown` never pins the
 * app's verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  description:
    "Not exposed: Rippling documents a 300-requests-per-10-seconds burst threshold but no remaining-quota header or usage endpoint.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Rippling publishes no rate-limit headers or usage endpoint; the burst threshold is a penalty window, not a readable budget.",
  },
};

export default quota;
