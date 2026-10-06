import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Raisely's OpenAPI document declares a `429` (`code: "rate limit exceeded"`) on every operation
 * but publishes no limit, no rate-limit response header and no usage endpoint (searched the
 * document; none of the live responses measured 2026-10-06 carried a `ratelimit`/`retry-after`
 * header). A refusal is not a reading, so this is a declared absence. `informational` keeps the
 * permanent `unknown` from pinning the app's verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Raisely publishes no readable headroom: no stated rate limit, no rate-limit header " +
      "and no usage endpoint. The only signal is a 429 `rate limit exceeded` once it is hit.",
  },
};

export default quota;
