import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota signal exists: a positive fact, not an omission.
 *
 * Checked on 2026-10-06: the OpenAPI document has no rate-limit description, no `X-RateLimit-*`
 * header on any response, and no 429. The one usage surface, `GET /v2/settings/users/{userId}/
 * api-usage-stats`, takes an `aggregation` value the document does not enumerate, so it is not
 * used. `severity: "informational"` so the permanent `unknown` does not pin the App.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Metricool's API reference documents no rate limit or remaining-request header, and " +
      "its api-usage-stats endpoint needs an aggregation value the reference does not list.",
  },
};

export default quota;
