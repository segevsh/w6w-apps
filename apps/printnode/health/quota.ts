import type { HealthCheckDefinition } from "@w6w/types";

/**
 * PrintNode exposes no remaining-quota signal. Verified against the reference: the only limit
 * documented is 10 requests/second per account, enforced by `429 TooManyRequests` after the
 * fact, and the documented response headers (Request-Id, Elapsed, Records-*) carry no
 * remaining/reset count. `GET /whoami` returns a `credits` figure, but the reference never
 * defines what it measures, so it is not turned into a headroom verdict.
 *
 * `severity: "informational"` is load-bearing: see `service.ts`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "PrintNode documents a fixed 10 requests/second per-account limit enforced by HTTP " +
      "429, and sends no remaining-count or reset header. The `credits` field of `GET /whoami` " +
      "is not defined in the reference, so no headroom is derived from it.",
  },
};

export default quota;
