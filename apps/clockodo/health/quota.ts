import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The Clockodo reference documents a 429 "too many requests" status but no limit, no rate-limit
 * headers and no usage or credit endpoint, so there is no headroom to read.
 *
 * `severity: "informational"` is required: an `unavailable` entry always reports `unknown`, which
 * would otherwise pin the app's verdict there permanently.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Clockodo documents a 429 status but no limit, no rate-limit headers and no usage " +
      "endpoint; headroom only shows up after it has been exceeded.",
  },
};

export default quota;
