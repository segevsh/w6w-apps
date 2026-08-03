import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Smartsheet exposes no headroom to read, so there is nothing to probe.
 * Declared rather than omitted, so a host can tell "we cannot know" from
 * "nobody looked".
 *
 * ## Why this is `unavailable` and not a probe — checked, not assumed
 *
 * Smartsheet documents the limit clearly enough: "The general limit for most API
 * requests is **300 requests per minute per API token**", with a much tighter
 * **30 requests per minute per API token** on the heavy endpoints (attachment
 * upload, cell images, sheet copy, publish, `imageurls`), and error
 * `4003 "Rate limit exceeded."` when you cross it.
 *
 * What it does not publish is any way to read your remaining allowance. The
 * rate-limiting guide names no response header, and live responses from
 * `api.smartsheet.com` on 2026-08-03 carried none — three different calls
 * (`200 /serverinfo`, `401 /users/me` with a bad token, `404` on a bogus path)
 * returned the same header set, and it contains no `RateLimit`,
 * `X-RateLimit-*`, or `Retry-After` field. The only Smartsheet-specific headers
 * present are `x-smar-halo-version` and `x-smar-halo-release`, which are build
 * identifiers.
 *
 * So a "quota" probe here could only report the static number 300, which is a
 * constant, not a reading. `severity: "informational"` — an `unavailable` entry
 * reports `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Smartsheet publishes no headroom endpoint and returns no rate-limit headers. It enforces " +
      "300 requests/minute per API token (30/minute on heavy endpoints such as attachment upload " +
      "and sheet copy) and answers errorCode 4003 'Rate limit exceeded.' once you cross it — but " +
      "nothing in a successful response says how much of that budget is left, so the only signal " +
      "is the call that gets rejected.",
  },
};

export default quota;
