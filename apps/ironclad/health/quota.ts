import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ironclad publishes its rate limits and the headers that report them
 * (`X-RateLimit-Limit`, `-Remaining`, `-Reset`, plus `Retry-After` on a 429), but the limits are
 * per-company *buckets* keyed by method and path (`pub:workflows:read` 400 rpm,
 * `pub:workflows:write` 40 rpm, `pub:records:read` 600 rpm, …) under a 4,500 rpm company-wide cap,
 * and the headers describe only the bucket the probed request fell into.
 *
 * Reading them would need a signed call to one resource endpoint, and the only scope-free
 * authenticated read (`/oauth/userinfo`) is not documented to carry them — verifying that needs a
 * live token, which this app was built without. A probe on one bucket would report that bucket's
 * headroom as "the account's" while a workflow's write bucket (40 rpm) exhausts unseen, and a probe
 * on a scoped resource would flag a correctly-scoped connection as broken. So this is a declared
 * absence.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
 * `unknown` outranks `ok` in the roll-up, so at any other severity it would pin the app at
 * `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Ironclad's limits are per-company buckets by method and path (workflow writes are 40 " +
      "requests/minute, record reads 600) and the X-RateLimit-* headers describe only the bucket " +
      "a request falls in, so no single probe reports the account's headroom.",
  },
};

export default quota;
