/**
 * No `quota` check — declared, not omitted.
 *
 * Wix publishes an allowance in prose (its Contacts documentation states "Wix
 * API rate limits allow an app to perform up to 200 requests per minute, per
 * instance", with tighter separate ceilings for bulk endpoints — 100 items and
 * 50 requests per minute for synchronous bulk operations, 10 per minute for the
 * asynchronous by-filter ones). What it does **not** publish is any way to read
 * remaining headroom.
 *
 * Confirmed live 2026-08-03 against `https://www.wixapis.com`. Two real
 * endpoints — `GET /wix-data/v2/collections` and `POST /contacts/v4/contacts/query`
 * — were called and their full response headers inspected. The complete set of
 * non-standard headers Wix returns is:
 *
 *     x-wix-responded-by, x-seen-by, glb-x-seen-by, x-wix-request-id,
 *     access-control-expose-headers, x-robots-tag, x-content-type-options,
 *     server: Pepyaka, via, alt-svc, set-cookie: XSRF-TOKEN
 *
 * There is no `RateLimit-*`, no `X-RateLimit-*`, no `Retry-After`, and no
 * vendor-specific counter of any kind. Unlike Webflow (`X-RateLimit-Remaining`)
 * or Brevo (`x-sib-ratelimit-*`), there is simply nothing on the wire to read.
 *
 * The 200/minute figure is a published constant, not a live reading. Reporting
 * it as remaining headroom would be inventing a number Wix does not expose, and
 * it would be wrong the moment anything else shares the API key — which is the
 * normal case, since a Wix API key is minted per *account* and may be scoped to
 * many sites at once.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 * Informational checks never worsen a verdict; they are carried for display.
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
      "Wix documents a fixed allowance (200 requests/minute per instance, with tighter bulk " +
      "ceilings) but returns no rate-limit response headers — live calls to " +
      "GET /wix-data/v2/collections and POST /contacts/v4/contacts/query carry no RateLimit-*, " +
      "X-RateLimit-* or equivalent counter — so there is nothing for this app to read ahead " +
      "of a 429.",
  },
};

export default quota;
