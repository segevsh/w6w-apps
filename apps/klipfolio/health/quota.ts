import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The API reference states a limit of five requests per second plus a daily
 * allowance that depends on the plan (resets at 12:00 am ET); excess requests
 * get 429. It documents no rate-limit response header and no usage endpoint, so
 * there is no headroom to read. Declared rather than omitted.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Klipfolio enforces 5 requests/second and a plan-dependent daily request allowance (429 on excess, daily reset 12:00 am ET) but documents no rate-limit header or usage endpoint to read headroom from.",
  },
};

export default quota;
