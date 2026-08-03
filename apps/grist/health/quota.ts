import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Grist exposes no request headroom to read, so there is nothing to probe.
 * Declared rather than omitted, for the same reason as the absent status
 * service: a host should be able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict.
 *
 * ### Verified three ways, on 2026-08-03
 *
 * 1. **Nothing on the wire.** `GET https://docs.getgrist.com/api/profile/user`
 *    returned its full header set — `date`, `content-type`, `content-length`,
 *    `x-powered-by`, `content-language`, the CORS trio, `cache-control`, `etag`,
 *    `set-cookie` — with no `RateLimit-*`, no `X-RateLimit-*` and no
 *    `Retry-After` among them.
 * 2. **Nothing in the specification.** Grist's own OpenAPI document
 *    (`gristlabs/grist-help`, `api/grist.yml`, 4416 lines) contains zero
 *    occurrences of `429`, `rate limit`, `Retry-After` or `throttl` — no
 *    endpoint declares a throttled response, and no header is documented.
 * 3. **Nothing that would generalise.** A self-hosted Grist enforces whatever
 *    its own reverse proxy does, which the app has no way to read.
 *
 * ### The endpoint that exists, and why it is not this check
 *
 * `GET /api/orgs/{orgId}/usage` is real and is in the spec, but it answers a
 * different question. It reports **data** limits, not request allowance:
 * `countsByDataLimitStatus` (how many documents are approaching their row limit,
 * in a grace period, or delete-only) and `attachments.totalBytes`. A `quota`
 * check exists to say whether the next call will be throttled, and document row
 * counts do not predict that.
 *
 * It is also unusable as an unattended probe on two counts. Its own description
 * says "Only accessible to organization owners", so a perfectly good key
 * belonging to a non-owner reports a failure that is not one. And the limits it
 * reports are a property of getgrist.com's billing plans, which do not exist on
 * a self-hosted install — where the same call has nothing meaningful to say.
 *
 * Reporting `unknown` on every run, or reporting an owner-only billing metric as
 * if it were rate-limit headroom, are both worse than saying plainly that there
 * is no headroom to read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Grist publishes no request-rate headroom: a live API response carries no RateLimit-*, " +
      "X-RateLimit-* or Retry-After header, and its OpenAPI specification documents no 429 and no " +
      "rate limit anywhere. The one usage endpoint that exists (GET /orgs/{orgId}/usage) meters " +
      "DOCUMENT DATA — row-limit status and attachment bytes — is documented as owner-only, and " +
      "describes getgrist.com billing plans that a self-hosted install does not have.",
  },
};

export default quota;
