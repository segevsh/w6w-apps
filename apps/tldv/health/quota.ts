/**
 * Quota headroom — a declared absence.
 *
 * tl;dv's OpenAPI document names no rate-limit or usage-metering header or
 * endpoint anywhere, and none was observed live on 2026-08-16 — a probe
 * response (`GET /v1alpha1/meetings` with a bad key) carried no
 * `X-RateLimit-*`, `Retry-After`, or similar header. The vendor's plan table
 * (Free / Pro / Business / Enterprise, see the README) gates API EXPORT
 * ACCESS by the meeting organizer's plan, not a per-key request quota, so
 * there is no ceiling-and-current-usage pair to read the way Apify's or
 * GitHub's rate limits work.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, `unknown` outranks `ok` in the roll-up, and at any other
 * severity this would pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "tl;dv publishes no rate-limit or usage headers, and no metering endpoint — its " +
      "OpenAPI document names none and none was observed on live requests (2026-08-16). Export " +
      "access is gated by the meeting organizer's plan, not a readable per-key quota.",
  },
};

export default quota;
