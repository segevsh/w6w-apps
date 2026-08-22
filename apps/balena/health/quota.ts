import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**, measured rather than
 * assumed.
 *
 * Probed live on 2026-08-19, on both a successful request and a rejected one:
 * balena returns no `RateLimit-*`, no `X-RateLimit-*` and no `Retry-After`.
 * There is nothing to read.
 *
 * ## The limits that bind a balena account are not request rates
 *
 * They are the **device count** on the plan, and the fleet's own physics. A
 * workflow that lists a thousand devices every minute is not going to be rate
 * limited; it is going to pull a large response a thousand times, since balena
 * pages with `$top` and returns whatever you ask for.
 *
 * The number worth alerting on is how many devices are provisioned against how
 * many the plan allows, and `fleet-get` counts the first.
 *
 * ## And the real constraint is the device, not the API
 *
 * Every supervisor action needs the device online, and a fleet on cellular
 * connectivity is intermittently unreachable by design. `device-list` reports
 * the `timeout` heartbeat state for exactly that reason. No API quota
 * describes it.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Declared unavailable — measured live, balena publishes no rate-limit header on success or " +
    "failure. What binds an account is the plan's DEVICE COUNT, and what binds a workflow is " +
    "whether the device is online at all.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason:
      "balena publishes no rate-limit headers. Measured on 2026-08-19 against both a successful " +
      "request and a 401: no `RateLimit-*`, no `X-RateLimit-*`, no `Retry-After`. The " +
      "constraints that actually bind are elsewhere — the plan's device count, which `fleet-get` " +
      "counts against, and device reachability, since every supervisor action needs the device " +
      "online and a cellular fleet is intermittently unreachable by design. `device-list` " +
      "reports the `timeout` heartbeat state for that reason.",
  },
};

export default check;
