/**
 * Do we have quota left? — declared absent, because Graph does not say.
 *
 * Directory calls (users, groups, applications, servicePrincipals) are throttled by the *identity
 * and access* ResourceUnit model, per app and tenant. Microsoft documents the only proactive
 * signal as the `x-ms-throttle-limit-percentage` response header, "returned only when the
 * application consumed more than 0.8 of its limit" — so a healthy connection carries nothing to
 * read, and there is no headroom endpoint. Throttling is otherwise reactive: `429` with a
 * `Retry-After` header and error code `ResourceUnitLimitExceeded` (or `TooManyRequests`).
 * https://learn.microsoft.com/en-us/graph/throttling-limits
 *
 * `severity: "informational"` for the same reason as the `service` check.
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
      "Microsoft Graph publishes no headroom endpoint. For identity and directory calls the only proactive signal is the `x-ms-throttle-limit-percentage` header, which Microsoft returns only once an app has consumed more than 80% of its ResourceUnit limit (so it is absent on a healthy connection). Otherwise throttling is reactive: HTTP 429 with a `Retry-After` header.",
  },
};

export default quota;
