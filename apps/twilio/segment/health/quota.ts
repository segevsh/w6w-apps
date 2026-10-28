/**
 * Quota — declared absent, honestly.
 *
 * The Tracking API documents a 1,000 requests/second per-workspace rate
 * limit, but exposes no leading indicator of headroom: a successful response
 * carries no `X-RateLimit-Remaining`/`X-RateLimit-Limit` (or equivalent)
 * headers. The only rate-limit signals documented — `Retry-After` and
 * `X-RateLimit-Reset` — appear solely on a `429` response, i.e. only *after*
 * the limit is already exceeded, which makes them useless as a proactive
 * quota check (there's nothing to poll that answers "how much headroom is
 * left" before that point).
 *
 * Per rfcs/healthcheck.md: "Say so when a vendor publishes nothing" — an
 * `unavailable` entry is a first-class answer, not an omission, and
 * `severity: "informational"` keeps a permanent `unknown` from pinning this
 * App's roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Segment's Tracking API exposes no proactive quota signal — X-RateLimit-* headers " +
      "appear only on an already-rejected 429 response, not on success.",
  },
};

export default quota;
