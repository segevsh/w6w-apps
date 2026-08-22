/**
 * Vanta's limits are published, low, and unobservable.
 *
 * ## The numbers
 *
 * Verified 2026-08-18 against Vanta's own reference:
 *
 *   - **50 requests per minute** across the Manage Vanta endpoints;
 *   - **5 requests per minute** on `/oauth/token`.
 *
 * The second is the one that surprises people. Fifty a minute is tight but
 * workable for a compliance report; five a minute for token issuance means
 * minting a token per request is not merely wasteful but impossible, and it is
 * why this app's auth mints once per hour and the runtime holds it.
 *
 * It compounds with the one-active-token rule: a workflow that reacts to a
 * `401` by immediately re-minting can exhaust the token limit in seconds and
 * then have neither a working token nor a way to get one for a minute.
 *
 * ## Why this is a declared absence
 *
 * There is nothing to read. Vanta publishes no usage endpoint and documents no
 * `Retry-After` or `X-RateLimit-*` header — the reference says only that
 * exceeding a limit returns `429` and to "back off and retry after a short
 * delay". A poll would consume one of the fifty every interval to report
 * `unknown`, which is a strictly negative trade.
 *
 * The consequence is surfaced where it can be acted on: `describeError`
 * distinguishes the two limits on the `429` itself, and the `tenant` check runs
 * at a fifteen-minute interval so it does not crowd out real work.
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
    reason: "Vanta publishes its limits but no way to observe them. Verified 2026-08-18: 50 " +
      "requests per minute across the Manage Vanta endpoints and only 5 per minute on " +
      "`/oauth/token`. Exceeding either returns 429, and the reference documents no " +
      "`Retry-After` or `X-RateLimit-*` header and no usage endpoint — it says only to back off " +
      "and retry. A poll would therefore spend one of the fifty every interval to report " +
      "`unknown`. The token limit compounds with Vanta's one-active-token-per-application rule: " +
      "reacting to a 401 by re-minting immediately can exhaust it in seconds and leave the " +
      "connection with neither a working token nor a way to get one. Both limits are named on " +
      "the 429 itself instead.",
  },
};

export default quota;
