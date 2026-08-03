/**
 * No `quota` check — declared, not omitted.
 *
 * Kit publishes a hard allowance in prose (120 requests per rolling 60 seconds
 * for an API key, 600 for an OAuth token) but emits **no rate-limit response
 * headers** to read remaining headroom from. Two independent confirmations,
 * both on 2026-08-03:
 *
 *   1. Kit's own v4 OpenAPI document (developers.kit.com/api-reference/v4.json)
 *      contains no `RateLimit-*`, `X-RateLimit-*` or `X-Rate-Limit-*` header
 *      anywhere — not in a response definition, not in a component.
 *   2. A live request to `GET https://api.kit.com/v4/account` returns only
 *      `x-request-id` and `x-runtime` among its custom headers. No counter.
 *
 * So unlike Brevo (`x-sib-ratelimit-*`) or Klaviyo (`RateLimit-*`), there is
 * nothing here to parse. The 120/minute figure is a published constant, not a
 * live reading — reporting it as remaining headroom would be inventing a
 * number Kit does not expose, and would be wrong the moment anything else
 * shares the credential.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Kit documents a fixed allowance (120 requests/60s for an API key, 600 for OAuth) but " +
      "returns no rate-limit response headers — neither its v4 OpenAPI document nor a live " +
      "GET /v4/account carries a RateLimit-*, X-RateLimit-* or equivalent counter — so there " +
      "is nothing for this app to read ahead of a 429.",
  },
};

export default quota;
