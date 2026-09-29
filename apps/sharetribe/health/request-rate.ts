import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Sharetribe publishes no readable rate-limit/quota headroom for the Integration API, so this
 * declares `unavailable` with a reason rather than pretending to probe.
 *
 * Verified 2026-09-29 two ways:
 *
 * 1. **Nothing on the wire.** A live `GET marketplace/show` response (both a 200 with a valid
 *    token, and the 401s used by `auth/integration-app.ts`'s `test`) carried no
 *    `X-RateLimit-*`/`RateLimit-*`-shaped header of any kind.
 * 2. **Nothing in the documentation.** The reference's "Rate limits" section states fixed
 *    ceilings in prose only (1 req/s query, 1 req/2s command — both **dev/test environments
 *    only**, per client IP; 100 req/min total for `listings/create`; 5 req/30min for
 *    `users/verify_email`; 10 concurrent requests per client IP) and documents no remaining-count
 *    endpoint or header. The only signal is the `429` itself, after the fact.
 *
 * `severity: "informational"` is load-bearing — an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity this declared absence
 * would pin the app's overall verdict at `unknown` forever.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Sharetribe exposes no remaining-request-count header or quota endpoint for the " +
      "Integration API. Documented ceilings are fixed and prose-only: in the dev/test " +
      "environments, 1 query request/second and 1 command request/2 seconds per client IP; " +
      "in every environment, 100 req/min total for listings/create, 5 req/30min for " +
      "users/verify_email, and 10 concurrent requests per client IP. The documented signal is " +
      "the 429 response itself.",
  },
};

export default requestRate;
