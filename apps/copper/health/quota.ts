import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Copper publishes a rate limit but exposes no headroom, so there is nothing to
 * probe. Declared rather than omitted, for the same reason as an absent status
 * feed: a host should be able to tell "we cannot know" from "nobody looked".
 *
 * ## What was checked, and what it showed
 *
 * Copper's limits are documented plainly on its Requests page (verified
 * 2026-08-03): "All API calls are limited to 180 requests per minute. Once this
 * limit has been reached, calls will return an error response with status code
 * 429. This rate limit is evaluated on a rolling window basis." Bulk endpoints
 * carry a second limit of 3 requests per second.
 *
 * So there IS a real budget. The question a `quota` check has to answer is
 * whether any of it is *readable* before you exhaust it, and the answer is no:
 *
 *  1. **Nothing in the documentation names a header.** A search of every page on
 *     developer.copper.com for `X-RateLimit-*`, `RateLimit-*` and `Retry-After`
 *     returns zero occurrences. The only response header Copper documents at all
 *     is `X-PW-TOTAL`, on `/search` responses, and that is a result count.
 *  2. **A live request confirms it.** `GET https://api.copper.com/developer_api/v1/users/me`
 *     on 2026-08-03 returned its full header set — `date`, `content-type`,
 *     `cache-control`, `vary`, `x-request-id`, `x-runtime`,
 *     `strict-transport-security`, `x-frame-options`, `x-download-options`,
 *     `content-security-policy` — and not one rate-limit header among them.
 *
 * A probe would therefore have to either report `unknown` on every run, or infer
 * headroom by counting its own calls, which measures this app's traffic rather
 * than the credential's actual allowance (the 180/minute is shared across
 * everything using that key, including other integrations). Both are worse than
 * saying so.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict. Without it, this app's
 * health would be pinned at `degraded` forever for the crime of being honest.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Copper enforces 180 requests/minute per credential on a rolling window (and 3 requests/second on its bulk endpoints), but publishes no way to read the remaining allowance: its documentation names no rate-limit header, and a live call to `GET /users/me` returns none. The only signal is the 429 itself, and reading it requires making the call that gets rejected.",
  },
};

export default quota;
