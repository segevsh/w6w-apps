import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The Admin API is metered, but the remainder cannot be read.
 *
 * Plans carry a monthly request allowance — "Scale: 5,000 / month, $0.002 per extra request;
 * Growth and Mighty Pro: custom" (<https://docs.mightynetworks.com/admin-api#rate-limit-and-quota>)
 * — and a 429 means the rate limit was hit. The OpenAPI document
 * (<https://api.mn.co/admin/v1/spec/rest.json>, 61 paths) contains no usage or quota path, and the
 * docs describe no usage endpoint or rate-limit response header, so there is nothing to probe.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Mighty Networks meters the Admin API per plan (5,000 requests a month on Scale, " +
      "custom above that) but publishes no usage endpoint or rate-limit header: the OpenAPI " +
      "document has no usage path and the docs describe none.",
  },
};

export default quota;
