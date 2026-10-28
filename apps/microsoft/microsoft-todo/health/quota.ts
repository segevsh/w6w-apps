/**
 * Do we have quota left? — declared absent, because Graph does not say.
 *
 * Microsoft's throttling model for the To Do endpoints is reactive, not
 * advertised: you learn you are over the line by being told to go away. A
 * throttled call answers `429 Too Many Requests` with a `Retry-After` header and
 * error code `TooManyRequests`; successful calls carry no rate-limit headers at
 * all. There is nothing to poll from a cold start, so there is no probe to
 * write.
 *
 * The one proactive signal Graph documents — `x-ms-throttle-limit-percentage`,
 * emitted once an app passes 0.8 of its budget — belongs to the *identity and
 * directory* ResourceUnit model (users, groups, applications), not to the
 * Outlook-family service that backs To Do.
 *
 * To Do is served by the Outlook service (its docs live under
 * `ms.subservice: outlook`, and its ids are Exchange item ids), so the published
 * Outlook ceilings are the ones that apply. They are recorded in `reason` so an
 * operator diagnosing a burst of 429s has the numbers to hand — but note they
 * are *documented limits*, not a live reading, which is exactly why this is
 * declared unavailable rather than implemented as a check that would have to
 * guess at consumption.
 *
 * `severity: "informational"` for the same reason as the `service` check: a
 * declared absence always reports `unknown`, and must not pin the verdict.
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
      "Microsoft Graph publishes no headroom endpoint and no rate-limit headers on successful To Do responses. Throttling is reactive: a 429 with error code `TooManyRequests` and a `Retry-After` header. To Do is backed by the Outlook service, so the applicable documented ceilings are 10,000 requests per 10 minutes per app-and-mailbox pair, 4 concurrent requests, and 150 MB of PATCH/POST/PUT payload per 5 minutes. The proactive `x-ms-throttle-limit-percentage` header exists only for the identity/directory ResourceUnit model, not for the Outlook family.",
  },
};

export default quota;
