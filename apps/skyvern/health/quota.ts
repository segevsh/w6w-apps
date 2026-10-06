/**
 * Rate-limit / credit headroom — declared unavailable.
 *
 * Skyvern's responses carry a `ratelimit-policy: "submit-run";q=50;w=60` header (a static policy:
 * 50 run submissions per 60 s, seen on every response including errors and unauthenticated ones),
 * but no `ratelimit-remaining` style header was observed and no endpoint in the OpenAPI document
 * (version 1.0.0, checked 2026-10-06) reads back a credit balance or plan ceiling. Runs are
 * billed per step, so a spend ceiling is `max_steps` on the run itself.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Skyvern publishes no remaining-quota header and no balance or plan-limit endpoint " +
      "(OpenAPI 1.0.0, checked 2026-10-06). Responses carry only a static `ratelimit-policy` " +
      '("submit-run";q=50;w=60), which is a ceiling, not headroom.',
  },
};

export default quota;
