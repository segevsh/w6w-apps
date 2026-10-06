import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota signal was found - a positive statement, not an omission.
 *
 * Checked 2026-10-06: the OpenAPI embedded in the reference pages documents no
 * rate-limit response, no `429`, no rate-limit header and no usage endpoint, and an
 * unsigned 401 carries no `X-RateLimit-*` header. Mural's separate "Rate limits"
 * docs page was not machine-readable here and is not relied on; this is a read of
 * the API definition plus an unauthenticated response.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` an unavailable
 * check reports would pin the App's verdict there.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Mural's API definition documents no rate-limit headers, 429 response or usage " +
      "endpoint, so there is no remaining-request signal to read.",
  },
};

export default quota;
