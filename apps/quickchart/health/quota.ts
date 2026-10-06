import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota signal exists. QuickChart rate-limits the free tier (HTTP 429, with a
 * `Retry-After` header "when present") but publishes no limit figure, no remaining-requests header
 * and no usage endpoint — checked against the docs and OpenAPI document 2026-10-06, and the
 * response headers of live calls carried no rate-limit fields.
 *
 * `informational` so the permanent `unknown` this reports cannot pin the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "QuickChart rate-limits anonymous callers but publishes no limit, remaining-request " +
      "header or usage endpoint.",
  },
};

export default quota;
