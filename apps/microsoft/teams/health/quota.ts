/**
 * Do we have quota left? — declared absent, because Graph does not say.
 *
 * Microsoft's throttling model for the Teams endpoints is reactive, not
 * advertised: you learn you are over the line by being told to go away. A
 * throttled call answers `429 Too Many Requests` with a `Retry-After` header and
 * error code `TooManyRequests`; successful calls carry no rate-limit headers at
 * all. There is nothing to poll from a cold start, so there is no probe to
 * write.
 *
 * The one proactive signal Graph documents — `x-ms-throttle-limit-percentage`,
 * emitted once an app passes 0.8 of its budget — belongs to the *identity and
 * directory* ResourceUnit model (users, groups, applications), not to the
 * Teams service.
 *
 * Teams adds a second, non-quantified ceiling that a quota probe could not see
 * even if one existed, and it is recorded in `reason` because it is the limit
 * most likely to bite a workflow: the Teams API terms cap **polling a resource
 * at once per day**, with change notifications named as the supported
 * alternative. An App can be comfortably inside every request-rate limit and
 * still be in violation.
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
      "Microsoft Graph publishes no headroom endpoint and no rate-limit headers on successful Teams responses. Throttling is reactive: a 429 with error code `TooManyRequests` and a `Retry-After` header. The proactive `x-ms-throttle-limit-percentage` header exists only for the identity/directory ResourceUnit model, not for Teams. Separately, the Teams API polling policy caps polling a resource at once per day — change notifications are the supported alternative — and no probe can measure conformance with that.",
  },
};

export default quota;
