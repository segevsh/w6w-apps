import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Gladia exposes no readable quota: no wallet/credit-balance endpoint and no `X-RateLimit-*`
 * header appears anywhere in `api.gladia.io/openapi.json` (checked 2026-10-06). Free accounts
 * get a one-time EUR 50 grant and 3 concurrent jobs; paid accounts 25 concurrent + 300
 * queued; the only runtime signal is an HTTP 429, which reaches the caller as an error.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and at any other severity that would pin the app's verdict there forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance / concurrency headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Gladia publishes neither a credit-balance endpoint nor rate-limit response headers " +
      "(api.gladia.io/openapi.json, checked 2026-10-06). Concurrency (3 free / 25 paid jobs) " +
      "and balance are visible only in the dashboard; exhaustion surfaces as HTTP 429.",
  },
};

export default quota;
