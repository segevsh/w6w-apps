import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Google Ads meters hard, and publishes nothing to read.
 *
 * This was checked before being written off, because the temptation is to
 * invent a probe: the limits here are real and tiered, so "there must be an
 * endpoint" is a reasonable guess. There isn't one. Google's quota
 * documentation describes the limits and the error you get for crossing them,
 * and names no endpoint, field or response header that reports consumption or
 * headroom. `SearchGoogleAdsResponse` carries a
 * `query_resource_consumption` — but that is the cost of the query you just
 * ran, not what is left, and reading it would require *spending* quota to
 * report on quota.
 *
 * The limits themselves are per **developer token access level**, which is a
 * property of the connecting organisation's token and not knowable from here:
 * Test Account access is 15,000 operations/day against test accounts only;
 * Explorer 2,880/day against production accounts (15,000 against test); Basic
 * 15,000/day; Standard unlimited. Exhaustion surfaces as `RESOURCE_EXHAUSTED`
 * (`QuotaError.RESOURCE_EXHAUSTED`) on the next call, which the client already
 * surfaces with its error code intact.
 *
 * Declared rather than omitted: a host should be able to tell "we cannot know"
 * from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no headroom endpoint and no rate-limit response headers for the Google Ads API. Daily limits are set by the developer token's access level — Test Account 15,000 operations/day (test accounts only), Explorer 2,880/day on production accounts, Basic 15,000/day, Standard unlimited — and that level is a property of the connecting organisation's token, not something the API reports. Exhaustion surfaces only as a `RESOURCE_EXHAUSTED` error on the next call. `SearchGoogleAdsResponse.query_resource_consumption` reports the cost of a query already run, not remaining headroom, and reading it would itself consume quota.",
  },
};

export default quota;
