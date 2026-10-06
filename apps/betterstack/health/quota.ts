import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota/rate-limit signal exists — a positive fact, not an omission.
 *
 * Checked on 2026-10-06: none of the Uptime API reference pages read (monitors,
 * heartbeats, incidents, on-call, status pages, pagination, getting started)
 * documents a request-rate ceiling or a metered API quota, and a 401 from the
 * API carries no `X-RateLimit-*` header. The one `429` in the reference sits on
 * the `GET /api/v2/usage` page, which lives on `betterstack.com` (a different
 * host, global-token only) and reports billing usage, not API headroom. That
 * is a documentation read plus an unauthenticated response, not a measurement
 * of an authenticated one.
 *
 * `severity: "informational"`: `unknown` outranks `ok` in a roll-up, so the
 * `degraded` default for `kind: "quota"` would pin the App there forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Better Stack's Uptime API reference documents no rate limit or usage quota for API " +
      "calls and exposes no remaining-request signal; the only 429 it mentions belongs to the " +
      "billing-usage endpoint on a different host.",
  },
};

export default quota;
