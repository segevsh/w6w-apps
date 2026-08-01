/**
 * Quota — declared absent, honestly.
 *
 * The official `customerio-node` SDK's retry policy (`lib/request.ts`,
 * `DEFAULT_RETRY`) treats `429` as retryable and honors a `Retry-After`
 * header on that response — but that is reactive, surfaced only *after* a
 * request has already been rejected. Neither the SDK nor the Track API
 * surfaces checked while building this app (region hosts, error body shape,
 * event/segment/merge endpoints) documents a proactive quota header
 * (`X-RateLimit-Remaining` or equivalent) on a *successful* response, which
 * is what a `kind: "quota"` check needs to answer "how much headroom is left
 * before that point".
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
    reason: "Customer.io's Track API exposes no proactive quota signal in the surfaces checked " +
      "— rate-limit handling (429 + Retry-After) is reactive, only after a request is already " +
      "rejected, with no leading-indicator header on a successful response.",
  },
};

export default quota;
