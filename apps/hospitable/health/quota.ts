import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Quota headroom: unavailable. The reference (developer.hospitable.com, Public API v2) gives
 * rate limits only as prose on a few endpoints — 1,000 requests/minute on the calendar read,
 * 2 messages/minute per reservation and 50 messages/5 minutes on message sends, per account for
 * a PAT — and documents no rate-limit header and no usage endpoint. Declared rather than guessed.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Hospitable documents rate limits only as prose on individual endpoints (calendar reads " +
      "1,000/min; message sends 2/min per conversation and 50 per 5 min, per account for a " +
      "Personal Access Token) and publishes no rate-limit header or usage endpoint, so there " +
      "is no headroom figure to read.",
  },
};

export default quota;
