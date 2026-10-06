import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared absence. LiveChat documents rate limits only in prose ("After exceeding those limits,
 * the requester will get a Too many requests error") and gives neither a headroom endpoint nor a
 * documented rate-limit header, so there is nothing honest to read. A breach surfaces as the
 * `too_many_requests` error type on the offending call.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "LiveChat's Web API reference documents rate limits in prose only: no headroom " +
      "endpoint and no rate-limit response header. Exceeding the limit returns the " +
      "`too_many_requests` error type.",
  },
};

export default quota;
