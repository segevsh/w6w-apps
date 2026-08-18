/**
 * dbt Cloud's rate limit is published, generous, and invisible until you cross
 * it — and crossing it is worse than usual.
 *
 * ## What dbt documents
 *
 * The Administrative API allows **5,000 requests per minute** across `/api/`;
 * the Discovery (GraphQL) API has its own separate 500/minute; SCIM user
 * writes are 20 per 5 seconds. Exceeding any of them returns `429 Too Many
 * Requests` with both `Retry-After` and `x-rate-limit-retry-after-seconds`.
 *
 * **And then a five-minute cooldown.** That is the part worth knowing: the
 * penalty for the limit is not "wait a moment", it is the account's API being
 * shut for five minutes. A polling loop that tightens on failure makes it
 * worse, which is why `describeError` says so on the 429 itself.
 *
 * ## Why this is a declared absence rather than a probe
 *
 * There is no consumption signal to read. dbt publishes no usage endpoint, and
 * the retry headers appear **only on the 429** — there is no `X-RateLimit-*`
 * header on a successful response saying how much of the 5,000 is left. A check
 * could only report `ok` until the moment it reported `down`, while spending a
 * request per interval against the very budget it is watching.
 *
 * So the limit is stated here as a fact, and the 429 is surfaced where it can
 * be acted on: on the call that hit it.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "dbt Cloud publishes its limits but not consumption. The Administrative API allows " +
      "5,000 requests per minute across `/api/` (the Discovery GraphQL API has a separate " +
      "500/minute, and SCIM user writes 20 per 5 seconds), and exceeding one returns 429 with " +
      "`Retry-After` and `x-rate-limit-retry-after-seconds` — headers that appear ONLY on the " +
      "429. No successful response carries remaining headroom and there is no usage endpoint, " +
      "so a poll would spend a request per interval to report `ok` until the moment it reported " +
      "`down`. It matters more here than usual because dbt enforces a five-minute cooldown once " +
      "the limit is hit, so the 429 is surfaced on the call that hit it, with that cooldown " +
      "named.",
  },
};

export default quota;
