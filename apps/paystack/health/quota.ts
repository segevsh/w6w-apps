import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Paystack publishes no readable headroom: no rate-limit response header (a 401 and a 404 from
 * api.paystack.co carried none, 2026-10-06), no usage endpoint, and the OpenAPI document has no
 * `429` response or limit. A refusal is not a reading, so this is a declared absence;
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
      "Paystack publishes no readable headroom: no rate-limit header on any response, no usage " +
      "endpoint, and no documented numeric limit in its OpenAPI document.",
  },
};

export default quota;
