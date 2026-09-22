import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Cloudbeds rate-limits — and publishes nothing to read headroom from, so this
 * declares `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict for this app at `unknown`
 * forever.
 *
 * ## What is documented, and what was observed
 *
 * The vendor's tech-specs page states **10 requests/second for all endpoints**,
 * and the error-handling guide says a `429` carries how long to wait
 * (`Retry-After`) and that the correct response is to pause for that long and
 * retry, spaced out so parallel jobs do not return at the same instant.
 *
 * What is **not** published is any way to read the remaining allowance. Live
 * 401 responses from `api.cloudbeds.com/api/v1.3/getHotels` and `/userinfo` on
 * 2026-09-22 carried no `X-RateLimit-*`/`RateLimit-*` header of any kind, no
 * `Retry-After`, and there is no quota or usage endpoint in the reference
 * navigation. (The one place rate-limit headers do appear is the browser-facing
 * consent page at `/oauth` — `x-rate-limit-limit: 60` — which is Cloudbeds' own
 * login UI, not the API, and nothing this app reads.)
 *
 * So the only signal is the refusal itself. A 10-per-second window is also not a
 * meaningful thing to report as health: by the time a check ran and somebody
 * looked, it would have cleared. The actionable form of the signal is the error
 * message `lib/client.ts` throws, which names the limit and the `Retry-After`
 * wait.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Cloudbeds documents a limit of 10 requests/second for all endpoints but publishes no " +
      "remaining-request count: no API response carries a RateLimit-* header (verified against " +
      "live 401s on /getHotels and /userinfo), Retry-After appears only on the 429 itself, and no " +
      "quota endpoint exists. A 10-per-second window would be stale before a report was read, so " +
      "the client surfaces the limit and the Retry-After wait on the error instead.",
  },
};

export default quota;
