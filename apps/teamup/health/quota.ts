import type { HealthCheckDefinition } from "@w6w/types";

/**
 * TeamUp publishes no readable quota, so there is nothing to probe — stated as
 * a positive fact rather than left as a gap.
 *
 * Verified 2026-09-22 against the operation data in TeamUp's own API reference
 * (<https://docs.goteamup.com/api-reference>): no operation this app calls
 * documents a rate-limit header (`X-RateLimit-*`, `RateLimit-*`, `Retry-After`)
 * or an endpoint reporting remaining allowance, and the documented failure
 * envelope carries no quota detail. What *is* documented is the refusal itself
 * — `429` is one of the statuses TeamUp lists — which means headroom can only
 * be budgeted from observed refusals, not read in advance. `lib/client.ts`'s
 * error formatter says so on a 429 and recommends exponential backoff.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict. Declaring it keeps
 * the app off a permanent `unknown`, which is what omitting the check entirely
 * would cause.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "TeamUp documents a 429 rate-limit response but publishes no rate-limit header and no " +
      "endpoint reporting remaining allowance, so headroom cannot be read — only budgeted from " +
      "observed failures. TeamUp's own guidance for a 429 is to back off exponentially.",
  },
};

export default quota;
