import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of this token's rate-limit headroom is left?
 *
 * Softr's Database API "Rate Limiting" page
 * (`docs.softr.io/softr-api/softr-database-api/rate-limiting`) documents only
 * fixed ceilings, enforced per token:
 *
 *  - **Reads** (`GET`, `POST /search`): 40 requests/second.
 *  - **Writes** (`POST`, `PUT`, `PATCH`, `DELETE`): 30 requests/second.
 *
 * "When the limit is exceeded, the API returns a 429 Too Many Requests HTTP
 * status code. Back off and retry after a short delay." — no
 * `X-RateLimit-Remaining`, no reset timestamp, no other response header is
 * documented on that page or observed on any of the Database API's OpenAPI
 * reference pages fetched 2026-09-15 (`get-records`, `create-record`,
 * `get-databases`, …). The only signal Softr gives is the `429` itself, after
 * the request has already been refused — which is exactly the case this
 * pack's convention treats as `unavailable` rather than probed, since there is
 * nothing to read *in advance* of hitting the ceiling.
 *
 * The Studio Users API's setup guide documents no rate limit at all, and no
 * response headers of any kind — consistent with that host also having no
 * readable headroom signal.
 *
 * `severity: "informational"` for the same reason as `health/service.ts`: an
 * `unavailable` check always reports `unknown`, which must not outrank a
 * healthy connection's `ok`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  kind: "quota",
  scope: "connection",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Softr documents fixed per-token ceilings (40 reads/s, 30 writes/s) and a 429 on " +
      "the Database API, and nothing at all on the Studio Users API, but no response header or " +
      "endpoint on either host exposes a remaining count or reset time — the 429 itself is the " +
      "only signal, and it arrives after the request was already refused.",
  },
};

export default quota;
