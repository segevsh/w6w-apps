import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of this account's rate limit is left?
 *
 * ## There is nothing to read
 *
 * Duda documents its limits only as prose, on the getting-started page:
 *
 *   - a **global hard ceiling of 10 API calls per second** for every endpoint,
 *     with the recommendation to stay at roughly one call every 125ms;
 *   - a handful of **per-endpoint minute ceilings** — 20/minute for publish and
 *     unpublish, 60/minute for create-site and create-account, 300/minute for
 *     form submissions, 800/minute for contact-form data, and so on;
 *   - a bare **`429 Too Many Requests`** when one is breached.
 *
 * Checked live on 2026-09-22 against both regional hosts: a response carries
 * only `server`, `date`, `content-length` and (on a 401) `www-authenticate` /
 * `d-request-id`. **No `x-ratelimit-*` header of any kind is sent**, and Duda
 * publishes no usage or headroom endpoint. A check could therefore only answer
 * `unknown`, at the cost of a request against the very ceiling it was watching.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — at
 * any other severity, declaring this absence would pin the app at `unknown`
 * forever.
 *
 * The consequence is surfaced where it is actionable instead: this app's client
 * (`lib/client.ts`) turns a `429` into a message naming the limits, rather than
 * implying a quota that refills.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Duda publishes no rate-limit response headers or quota endpoint — only a flat prose " +
      "ceiling (10 req/s global, plus named per-endpoint minute ceilings like 20/min for publish) " +
      "enforced with a bare 429. Verified live 2026-09-22 on both api.duda.co and " +
      "api.eu.duda.co: responses carry no x-ratelimit-* header of any kind, so there is no " +
      "headroom figure any call could report.",
  },
};

export default quota;
