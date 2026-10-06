import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Fortnox's "Rate-limits for Fortnox API" guide states the limit — 300 requests
 * per minute per client id and tenant, enforced as a sliding window of 25
 * requests per 5 seconds, answered with HTTP 429 — but documents no response
 * header carrying the remaining allowance and no endpoint that reports it. The
 * only observable signal is the 429 itself, by which point the limit is
 * already exceeded, so there is nothing a probe can read ahead of time.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity it would pin the App's verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Fortnox documents a fixed limit (25 requests per 5 seconds per access token, " +
      "answered with HTTP 429) but no response header or endpoint that reports remaining " +
      "headroom, so there is nothing a probe can read before the limit is exceeded.",
  },
};

export default quota;
