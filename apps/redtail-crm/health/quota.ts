import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much API-call headroom is left on this credential?
 *
 * There is nothing to read. Redtail's own Postman collection documents no
 * rate limit anywhere (`grep`-checked the full 2.4MB export for "rate limit",
 * "throttle" and "X-RateLimit" — zero hits across all 261 endpoints), and a
 * live unauthenticated probe against `GET /contacts` on 2026-09-15 carried no
 * `X-RateLimit-*`, `RateLimit-*` or `Retry-After` header of any kind. A vendor
 * that documents no ceiling and exposes no readable counter or `429` response
 * leaves headroom unknowable rather than merely unread.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in a roll-up, so this keeps the app's
 * overall verdict from being pinned at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Redtail's Postman collection documents no rate limit for any of its 261 endpoints, and a " +
      "live probe (2026-09-15) carried no rate-limit header of any kind.",
  },
};

export default quota;
