import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**.
 *
 * Cloud Storage publishes no rate-limit header. Verified live on 2026-08-19: a
 * response carries no `x-ratelimit-*`, no `ratelimit`, and no `retry-after`
 * before a 429 actually happens. There is nothing to sample.
 *
 * The limit that exists is also not the shape a quota check assumes. Cloud
 * Storage's documented constraint is roughly **one write per second to a single
 * object name** — per *object*, not per bucket, project or credential. Overall
 * request volume scales essentially without limit; hammering one key does not.
 *
 * That has a practical consequence worth more than any number this check could
 * report: a workflow that appends to one object in a loop is rate-limited at
 * one iteration per second however it is parallelised, and the fix is
 * `object-compose` — write each chunk to its own name, concatenate afterwards.
 *
 * Reads of a single object have a similar though much higher ceiling, and both
 * ramp up as Cloud Storage learns the access pattern, which is why a burst
 * against a brand-new bucket can be throttled where the same burst an hour
 * later is not.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Not checkable. Cloud Storage publishes no rate-limit header, and its real constraint is " +
    "per-OBJECT — about one write per second to a single name, however many clients — which no " +
    "account-level number would describe.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason:
      "Cloud Storage returns no rate-limit header of any kind — verified live 2026-08-19: no " +
      "`x-ratelimit-*`, no `ratelimit`, no `retry-after` before a 429. There is no value to " +
      "sample. The documented limit is also per-OBJECT rather than per-account: roughly one " +
      "write per second to a single object name, however many clients are involved, while " +
      "overall request volume scales freely. A loop appending to one object is capped at one " +
      "iteration per second no matter how it is parallelised, and `object-compose` is the fix — " +
      "no headroom number would have said so.",
  },
};

export default check;
