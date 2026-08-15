import type { HealthCheckDefinition } from "@w6w/types";

/**
 * RingCentral exposes no readable headroom, so this declares `unavailable`
 * with a reason rather than pretending to probe.
 *
 * `severity: "informational"` for the same reason as `health/service.ts`: an
 * `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in
 * the roll-up.
 *
 * ## Verified two ways on 2026-08-15
 *
 * 1. **Nothing on the wire.** A full header dump of both an unauthenticated
 *    `GET /restapi` (200) and a rejected `GET /restapi/v1.0/account/~/extension/~`
 *    (401, syntactically plausible fake bearer token) carried exactly: `date`,
 *    `content-type`, `server: cloudflare`, `set-cookie: __cf_bm=…`,
 *    `content-language`, `cf-cache-status`, `cf-ray`, and on the 401 also
 *    `www-authenticate` and `rcrequestid`. There is no `X-RateLimit-Limit`, no
 *    `X-RateLimit-Remaining`, no `Retry-After` — no throttle header of any kind.
 * 2. **Nothing in the documentation.** The OpenAPI document tags every
 *    operation with an `x-throttling-group` (`Light`/`Medium`/`Heavy`/`Auth`/
 *    `NoThrottling`), which is the vendor's own classification of how
 *    aggressively an operation is rate-limited — but it publishes only the
 *    *group name*, never the actual request budget or a way to read remaining
 *    headroom for it. `TooManyRequests` (429) is documented as a possible
 *    response with no accompanying quota field.
 *
 * A `429` is documented as the only signal RingCentral gives, and it is
 * reactive, not predictive — there is nothing to read in advance. Reporting a
 * guessed number would be inventing headroom that does not exist as a
 * queryable value.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "RingCentral publishes no readable rate-limit or quota signal. A full header dump of both " +
      "an unauthenticated GET /restapi (200) and a rejected GET " +
      "/restapi/v1.0/account/~/extension/~ (401) carries no X-RateLimit-Limit, " +
      "X-RateLimit-Remaining or Retry-After, and the OpenAPI document tags each operation only " +
      "with a throttling GROUP NAME (Light/Medium/Heavy/Auth/NoThrottling), never a readable " +
      "budget or remaining count. The only signal is a reactive 429 at the point of use.",
  },
};

export default quota;
