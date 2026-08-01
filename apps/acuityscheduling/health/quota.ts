import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Acuity Scheduling exposes no headroom to read, so there is nothing to
 * probe. Declared rather than omitted, for the same reason as an absent
 * status service: a host should be able to tell "we cannot know" from
 * "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 *
 * Verified 2026-08-01 against the official API reference
 * (developers.acuityscheduling.com/reference): no endpoint documents request
 * quotas or rate-limit headroom, and no `/meta`, `/appointments`, or other
 * response documents `x-ratelimit-*` / `RateLimit-*` response headers.
 * Acuity does throttle (undocumented limits), so headroom has to be budgeted
 * from observed errors rather than read.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Acuity Scheduling's API v1 documents no headroom endpoint and no rate-limit response headers. Throttling exists but is undocumented, so headroom cannot be read — only budgeted from observed failures.",
  },
};

export default quota;
