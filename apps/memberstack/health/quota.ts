import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota signal exists — a positive fact, not an omission.
 *
 * The Admin REST API's only limit is a flat 25 requests per second (Quick Start,
 * "Rate Limits"; Data Tables add per-minute create/write caps). It answers with
 * `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` headers (observed live
 * 2026-10-05), but they describe a one-second window that refills before any health check
 * could act on it. No metering endpoint, plan-usage endpoint or monthly allowance is
 * documented. (Sandbox keys are capped at 50 test members, a property of the key, not a
 * queryable counter.)
 *
 * `severity: "informational"` so the permanent `unknown` an absence reports never pins the
 * App's overall verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Memberstack's Admin REST API publishes only a flat 25 requests/second limit " +
      "(ratelimit-* headers over a one-second window) and no usage or plan-quota endpoint.",
  },
};

export default quota;
