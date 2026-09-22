import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Workiz publishes no readable *request-rate* headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe. There is also no
 * `quota` check beside it: Workiz's OpenAPI document defines no account, usage,
 * limits or quota resource at all — the only resources are Jobs, Leads, Team and
 * Time Off — so there is no endpoint that could report headroom even in
 * principle.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Verified live, 2026-09-22
 *
 * 1. **Nothing on the wire.** A real response from `api.workiz.com` (the 403 a
 *    malformed/unauthenticated token returns) carried only `date`,
 *    `content-type`, `content-length`, `cache-control`, `expires`,
 *    `referrer-policy`, `x-frame-options`, `server` (cloudflare), `cf-ray` and
 *    `alt-svc`. There is **no** `X-RateLimit-Limit`, no `X-RateLimit-Remaining`
 *    and no `X-RateLimit-Reset` of any kind — the request-rate dimension is a
 *    documented absence, not a missed probe.
 * 2. **Nothing in the documentation.** The vendor's OpenAPI document defines no
 *    `/limits`, `/quota` or `/account` endpoint, and no response schema in it
 *    mentions rate-limit headers. The only ceiling signal Workiz offers is a
 *    refusal, which arrives after the request has already been made.
 *
 * Because neither the headers nor a limits resource exist, there is nothing to
 * read and nothing to probe — hence a declared absence rather than a check.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Workiz exposes no request-rate signal: a live API response carries no X-RateLimit-Limit, " +
      "no X-RateLimit-Remaining and no reset header of any kind, and the vendor's OpenAPI document " +
      "defines no account, usage, limits or quota endpoint at all — its only resources are Jobs, " +
      "Leads, Team and Time Off. Workiz reports a rate refusal only by refusing the call, so there " +
      "is nothing a health check could read in advance.",
  },
};

export default requestRate;
