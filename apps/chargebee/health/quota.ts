import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Chargebee exposes no headroom to read, so there is nothing to probe.
 *
 * This was looked for rather than assumed. Chargebee's own "Error handling and
 * rate limits" page publishes the ceilings — 150 requests/minute on Starter,
 * 1000 on Performance, 3500 on Enterprise, and 150/minute for every test site —
 * but the ONLY runtime signal it documents is the failure itself: "If you
 * receive an HTTP `429 Too Many Requests` error response ... Chargebee may also
 * send a `Retry-After` header indicating the time duration to wait". There is no
 * `RateLimit`, `X-RateLimit-*` or equivalent counter. A live request confirms it:
 * a response from `/api/v2/customers` carries `date`, `content-type`,
 * `cache-control`, `strict-transport-security`, `www-authenticate`, `vary` and
 * `server` — and nothing that counts anything (verified 2026-08-03).
 *
 * Two alternatives were considered and rejected:
 *
 *   - **Probe a cheap read and report `ok` unless it 429s.** That is not a quota
 *     reading; it is a second liveness check wearing a quota's label, and it can
 *     only ever report a limit that has ALREADY been hit. The derived
 *     `auth:api-key` check already covers liveness.
 *   - **Derive headroom from the published plan ceiling.** The App cannot know
 *     which plan the site is on, and a number this App invented would be worse
 *     than no number.
 *
 * So it is declared `unavailable` rather than omitted, for the same reason as an
 * absent status service: a host should be able to tell "we cannot know" from
 * "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Chargebee publishes no headroom endpoint and returns no rate-limit counter headers. The " +
      "documented ceiling is per site per minute and varies by plan (150 on Starter, 1000 on " +
      "Performance, 3500 on Enterprise; 150 for every test site), enforced by a 429 carrying " +
      "`api_error_code: api_request_limit_exceeded` and, sometimes, a `Retry-After` header.",
  },
};

export default quota;
