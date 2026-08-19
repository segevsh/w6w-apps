import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**, and measured rather than
 * assumed.
 *
 * ## Nothing to read
 *
 * Probed live on 2026-08-19: a request to `api.tailscale.com` carries no
 * `RateLimit-*`, no `X-RateLimit-*` and no `Retry-After`, on success or on a
 * rejected request. Tailscale's OpenAPI spec documents no rate-limit response
 * either, and it explicitly says the API has no pagination — which is the
 * closest thing to a stated request-shaping policy anywhere in it.
 *
 * The one header worth having is `x-tailscale-request-id`, which identifies a
 * request to Tailscale support. That is a diagnostic, not a budget, and this
 * app puts it into error messages rather than pretending it is a quota.
 *
 * ## And the ceiling that actually binds is not requests
 *
 * The limits a Tailscale account runs into are the plan's **user count** and
 * **device count**, not an API rate. Both are visible: `user-list` reports
 * anyone in the `over-billing-limit` state — a person who cannot join because
 * the plan is full — and `device-list` counts the fleet. Those are the numbers
 * to alert on, and they say something a request budget would not.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Declared unavailable — measured live, Tailscale publishes no rate-limit header of any " +
    "kind. The ceiling that actually binds an account is the plan's USER and DEVICE count, " +
    "which `user-list` and `device-list` report.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason:
      "Tailscale publishes no rate-limit headers. Measured on 2026-08-19: neither a successful " +
      "request nor a rejected one carries `RateLimit-*`, `X-RateLimit-*` or `Retry-After`, and " +
      "the OpenAPI spec documents no rate-limit response. The only header of note is " +
      "`x-tailscale-request-id`, which identifies a request to Tailscale support — a diagnostic " +
      "rather than a budget, and this app puts it into error messages instead. The limits an " +
      "account does hit are the plan's user and device counts: `user-list` reports anyone in " +
      "the `over-billing-limit` state, which is a person locked out because the plan is full, " +
      "and `device-list` counts the fleet.",
  },
};

export default check;
