import type { HealthCheckDefinition } from "@w6w/types";

/**
 * A declared absence. The developer documentation (Overview, Authentication,
 * Documents, Data Routes, Tools — read 2026-10-06) names no rate limit, no
 * quota endpoint and no `RateLimit-*` / `Retry-After` header. Plan limits exist
 * (merges per month) but are an account/billing fact, not API-readable.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity it would pin the verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Formstack Documents' API reference documents no rate limit, quota endpoint or rate-limit response header. Monthly merge allowances are a plan fact, not API-readable, so headroom cannot be read — only observed from failures.",
  },
};

export default quota;
