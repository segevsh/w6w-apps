import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Quota headroom — a declared absence.
 *
 * Plaud's Transcription API is metered (free ASR hours, then billed — see the Billing page
 * on docs.plaud.ai), but none of the four OpenAPI documents has an endpoint that reports the
 * remaining allowance, and the docs describe no rate-limit headers. There is nothing to read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  title: "Plaud quota",
  scope: "app",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason:
      "Plaud meters transcription (free ASR hours, then billed) but publishes no endpoint or " +
      "response header that reports the remaining allowance. Checked 2026-10-05 across the " +
      "auth, binding, file and transcription OpenAPI documents. Usage is visible only in the " +
      "developer portal.",
  },
};

export default quota;
