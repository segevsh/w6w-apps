/**
 * How much headroom is left on this credential — declared absent, honestly.
 *
 * A `quota` check reads one of two signals: rate-limit response headers, or an
 * endpoint that states an allowance. Mailjet publishes **neither**, and this was
 * checked on the wire rather than inferred from silence in the docs.
 *
 * ## No rate-limit headers
 *
 * Mailjet's rate-limits page (`dev.mailjet.com/email/reference/overview/
 * rate-limits/`, read 2026-08-03) says only that "If you reach a rate limit, our
 * API will return a `429` HTTP error code", and that transactional APIs get
 * "high rate limits" while the others are "much lower". No numbers, and no
 * `X-RateLimit-*` contract of any kind.
 *
 * Live responses agree — the full header set from `api.mailjet.com` on
 * 2026-08-03 was:
 *
 *     $ curl -sSD - -o /dev/null https://api.mailjet.com/v3/REST/apikey
 *     HTTP/2 401
 *     date: ...
 *     content-type: text/html
 *     www-authenticate: Basic realm="Provide an apiKey and secretKey"
 *
 *     $ curl -sSD - -o /dev/null -X POST https://api.mailjet.com/v3.1/send
 *     HTTP/2 401
 *     content-length: 14
 *     content-type: application/json; charset=UTF-8
 *     x-mj-request-guid: ...
 *     date: ...
 *
 * Not a single rate-limit header on either version, and `x-mj-request-guid` is a
 * trace id, not a counter.
 *
 * ## No allowance endpoint
 *
 * Mailjet's API reference index lists twelve resource families — Send, Messages,
 * Contacts, Campaigns, Segmentation, Templates, Statistics, Message Events,
 * Webhook, Parse, Senders/Domains, Settings. **None of them exposes plan limits,
 * remaining sends, or credits.** Pricing and plan allowances live on
 * mailjet.com/pricing and in the web app, not in the API.
 *
 * `/v3/REST/statcounters` counts what has been *sent*, which is a numerator with
 * no denominator: without the plan's monthly allowance it cannot yield headroom,
 * and inventing the denominator would be fabricating the answer this check
 * exists to report. The one endpoint that describes an API key at all —
 * `/v3/REST/apikey` — carries no quota fields and, worse, returns `SecretKey` in
 * plaintext, so this app never calls it (see `auth/basic.ts`).
 *
 * ## Why this is `unavailable` and not a guess
 *
 * Per rfcs/healthcheck.md, an App must be able to declare that no check exists
 * and have that be "a first-class answer rather than an omission".
 *
 * `severity: "informational"` is mandatory here and is not cosmetic: an
 * `unavailable` entry always reports `unknown`, and at the default `degraded`
 * severity that `unknown` would propagate into every roll-up and pin this App at
 * `unknown` permanently, regardless of how healthy everything else is.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Sending and rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Mailjet publishes no rate-limit response headers — its rate-limits page documents only " +
      "that a 429 is returned, with no numbers, and live v3 and v3.1 responses carry no " +
      "X-RateLimit-* headers at all (checked on the wire 2026-08-03). No endpoint in the API " +
      "reference reports plan limits, remaining sends or credits; /v3/REST/statcounters counts " +
      "messages sent but supplies no allowance to measure them against. Humans can see usage " +
      "and plan limits at https://app.mailjet.com.",
  },
};

export default quota;
