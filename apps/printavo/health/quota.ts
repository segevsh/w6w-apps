import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The API is limited to 10 requests per 5 seconds, but the reference documents no
 * remaining-request header or usage endpoint, so there is nothing to read.
 * `informational`, or the permanent `unknown` would pin the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Printavo limits the API to 10 requests per 5 seconds but documents no " +
      "remaining-request header or usage endpoint to read.",
  },
};

export default quota;
