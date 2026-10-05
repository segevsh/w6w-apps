import type { HealthCheckDefinition } from "@w6w/types";

/**
 * NetSuite's REST limit is a **concurrency** limit (simultaneous requests per account and per
 * integration), not a request budget, and there is no response header carrying remaining
 * headroom. The one place it is readable is `GET /services/rest/system/v1/governanceLimits`,
 * which Oracle documents as returning results "only if you are logged in as an administrator" —
 * so a check on it would report a perfectly good non-admin integration as broken. It is exposed as
 * the Get Concurrency Limits action instead.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * which would otherwise pin the app's verdict there forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "NetSuite limits concurrent REST requests rather than metering them, and the only readable " +
      "figure (governanceLimits) is administrator-only, so no headroom can be read with an " +
      "ordinary integration role. The Get Concurrency Limits action reads it for admin roles.",
  },
};

export default quota;
