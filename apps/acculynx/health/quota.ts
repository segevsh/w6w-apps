import type { HealthCheckDefinition } from "@w6w/types";

/**
 * AccuLynx rate-limits writes and some reads (the reference tags many operations "This endpoint is
 * rate limited" and defines `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`,
 * `RateLimit-Policy` and `Retry-After` response headers, with policies named like
 * `company-write:hourly` / `company-write:daily`), but it publishes no endpoint that reports
 * headroom, and the only response documented to carry the headers is the 429 itself, where
 * `RateLimit-Remaining` is always 0.
 *
 * Whether a successful 200 also carries them could only be checked with a live key, which this app
 * was verified without (AccuLynx issues keys to customers only). Declaring a probe on an unverified
 * header contract would report a healthy account as `unknown` or invent headroom, so this is a
 * declared absence.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity it would pin the App's
 * verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "AccuLynx documents RateLimit-* headers but only on 429 responses (where " +
      "RateLimit-Remaining is always 0) and publishes no endpoint that reports remaining " +
      "headroom, so there is nothing a probe can read before the limit is already exceeded.",
  },
};

export default quota;
