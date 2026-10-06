import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The v4 reference documents "up to 1500 api calls per hour for each link" in
 * its "API Call Limit" section, but no response header exposes the headroom —
 * a live request to an account host returns no rate-limit header of any kind
 * (checked for `rate`, `limit`, `remaining` in the response headers). Declared
 * absent so a host can tell "we looked" from "nobody looked".
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Salesmate documents a 1500-calls-per-hour-per-link cap in prose but returns no response " +
      "header (or other mechanism) to read the remaining headroom from.",
  },
};

export default quota;
