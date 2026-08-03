import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Tally exposes no headroom to read, so there is nothing to probe. Declared
 * rather than omitted, for the same reason as an absent status service: a host
 * should be able to tell "we cannot know" from "nobody looked".
 *
 * The documented allowance is **100 requests per minute**, stated in the API
 * introduction alongside a `429` response code — but it is enforced rather than
 * reported:
 *
 *   - the OpenAPI document declares **no response headers at all**, on any
 *     operation, so no `X-RateLimit-*` / `RateLimit-*` contract exists;
 *   - a live request to `GET https://api.tally.so/users/me` came back carrying
 *     none either (verified 2026-08-03 — the 401 response has no rate-limit
 *     header of any spelling);
 *   - there is no usage or metering endpoint. `GET /users/me` reports a
 *     `subscriptionPlan` (`FREE` / `PRO` / `BUSINESS`), which is a plan name,
 *     not a counter, and Tally publishes no per-plan call ceiling to compare it
 *     against.
 *
 * The vendor's own advice is to sidestep the budget rather than watch it: the
 * docs recommend webhooks over polling because webhook deliveries "won't count
 * against your rate limit".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Tally publishes no headroom or usage endpoint and returns no rate-limit headers. The documented allowance is 100 requests/minute per API key, enforced by a 429 rather than reported.",
  },
};

export default quota;
