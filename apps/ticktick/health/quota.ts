/**
 * Do we have quota left? — declared absent, because TickTick says nothing at
 * all.
 *
 * The Open API reference (`developer.ticktick.com/docs/openapi.md`, 67 KB, read
 * in full on 2026-08-03) contains **no** rate-limit section, no quota endpoint,
 * no documented `429`, and no `Retry-After` guidance. The per-endpoint response
 * tables enumerate `200`, `201`, `401`, `403` and `404` and stop there — `429`
 * is not among them anywhere in the document.
 *
 * Probed on the wire the same day: `api.ticktick.com` returns **no rate-limit
 * headers**. The complete response header set on a `401` is `date`,
 * `content-type`, two `AWSALB*` cookies, `vary`, `x-frame-options`,
 * `strict-transport-security`, `www-authenticate`, `cache-control`, `pragma`,
 * `x-content-type-options`, `x-xss-protection`. There is no `X-RateLimit-*`,
 * no `RateLimit-*`, no `Retry-After`.
 *
 * ## A note on the numbers you will find by searching
 *
 * Several third-party pages state specific TickTick limits — "100 requests per
 * minute per user, burst 10/second", "300 requests per 5 minutes",
 * "`X-RateLimit-Remaining` is returned". **None of these trace to a TickTick
 * source.** They appear on integration-marketing and API-directory sites that
 * publish generated guides for hundreds of vendors, they disagree with each
 * other, and the header they promise is demonstrably absent from live
 * responses. They are recorded here so the next person to find them knows they
 * were checked and rejected, not missed.
 *
 * So there is nothing to poll, and nothing honest to hard-code. Throttling — if
 * it exists — will reach this App the only way it can: as an unexpected status
 * from `api.ticktick.com`, surfaced verbatim by `lib/client.ts`.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`; the default severity for this kind is `degraded`, which would pin
 * this App's roll-up verdict at `unknown` permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      'TickTick publishes no rate limits, no quota endpoint and no rate-limit headers. Its Open API reference documents only 200/201/401/403/404 per endpoint — 429 appears nowhere in the document — and a live response from api.ticktick.com carries no X-RateLimit-*, RateLimit-* or Retry-After header (verified on the wire 2026-08-03). Third-party pages quoting figures such as "100 requests/minute" or an X-RateLimit-Remaining header have no TickTick source, contradict each other, and promise a header that is demonstrably absent, so none of them is encoded here. Throttling, if any, surfaces as an unexpected status from api.ticktick.com.',
  },
};

export default quota;
