import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Adyen publishes no readable quota: the Checkout OpenAPI document declares no
 * rate-limit header or usage endpoint, and none was observed on the 401
 * responses measured on 2026-10-05 (they carry only `cache-control`,
 * `strict-transport-security` and Cloudflare headers).
 *
 * `severity: "informational"` is load-bearing: see `service.ts`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Adyen's Checkout API documents no rate-limit header, quota endpoint or usage report " +
      "through the API, so there is no headroom to read.",
  },
};

export default quota;
