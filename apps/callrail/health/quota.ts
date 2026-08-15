/**
 * Plan/rate-limit headroom — declared unavailable.
 *
 * CallRail's reference documents fixed hourly/daily ceilings (1,000
 * requests/hour and 10,000/day general; 150/hour and 1,000/day for SMS sends;
 * 100/hour and 2,000/day for outbound calls) and says an exceeded limit
 * answers `429`. It does not document any response header or endpoint that
 * reports *remaining* headroom against those ceilings, and a live,
 * unauthenticated probe against `api.callrail.com/v3/a.json` on 2026-08-15
 * carried no `X-RateLimit-*` (or similarly named) response header at all.
 *
 * Unlike Apify's `/v2/users/me/limits` (limit *and* current usage in one
 * call) or GitHub's `/rate_limit`, there is nothing here to read — reporting a
 * number would mean fabricating one. `unavailable` is the honest answer:
 * `severity: "informational"` keeps it from pinning the app's overall verdict
 * at `unknown` forever (see rfcs/healthcheck.md).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description: "CallRail documents fixed hourly/daily request ceilings but exposes no header " +
    "or endpoint that reports remaining headroom against them.",
  kind: "quota",
  unavailable: {
    reason: "CallRail's API reference documents fixed rate-limit ceilings (requests/hour and " +
      "per-day) but does not publish a response header or endpoint that reports remaining " +
      "headroom against them. Verified live on 2026-08-15 — an unauthenticated probe against " +
      "/v3/a.json carried no X-RateLimit-* header.",
  },
  severity: "informational",
};

export default quota;
