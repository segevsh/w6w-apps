import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The reference documents no rate limit, no rate-limit headers and no usage endpoint (grepped the
 * restdocs page for `rate limit`, `X-RateLimit`, `429`, `requests per`: nothing), and the live
 * responses carry only `x-callcost: L` — an undocumented cost marker, not a budget. "How much is
 * left" cannot be read, so this is a declared absence; `informational` keeps the permanent
 * `unknown` from pinning the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "e-conomic's REST reference documents no rate limit or usage endpoint, and responses carry " +
      "no rate-limit headers, so headroom cannot be read.",
  },
};

export default quota;
