import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Shortcut publishes no readable request-rate headroom, so this declares
 * `unavailable` with a reason rather than pretending to probe.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## Verified two ways on 2026-09-15
 *
 * 1. **Nothing on the wire.** A live 401 response from `api.app.shortcut.com`
 *    carried `date`, `content-type`, `content-length`, `server-timing`,
 *    `request-key`, `access-control-allow-credentials`,
 *    `access-control-expose-headers`, `vary`, `x-content-type-options` and
 *    `strict-transport-security` — no `X-RateLimit-*` header of any kind, and
 *    no `Retry-After`.
 * 2. **Nothing in the documentation.** The vendor's "Rate Limiting" section
 *    states the ceiling as a fixed number and names the `429` itself as the
 *    only signal: "The Shortcut REST API limits requests to 200 per minute.
 *    Any requests over that limit will not be processed, and will return a 429
 *    ('Too Many Requests') response code."
 *
 * There is also no separate *plan-consumption* meter to report instead —
 * unlike a metered/billed API, Shortcut's only published limit is this fixed
 * per-minute request ceiling, so there is nothing for a `quota` check to add.
 */
const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Shortcut exposes no remaining request count: a live API response carries no " +
      "X-RateLimit-* header of any kind, and the vendor's Rate Limiting documentation names the " +
      "429 itself as the only signal. The ceiling is fixed at 200 requests/minute, and the " +
      "documented remedy is that requests over the limit are refused outright.",
  },
};

export default requestRate;
