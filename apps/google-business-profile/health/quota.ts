import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The Business Profile APIs expose no headroom endpoint and no quota
 * response headers — consistent with the rest of this pack's `google-*`
 * apps. Quota is per-project, configured and visible only in the Google
 * Cloud console; exhaustion surfaces as a 429 `RESOURCE_EXHAUSTED` on the
 * next call, not something a check can read ahead of time.
 *
 * `severity: "informational"` for the same reason as `service`: an
 * `unavailable` entry reports `unknown`, which must never be anything but
 * informational or it pins the roll-up.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Google publishes no headroom endpoint or rate-limit headers for the Business Profile APIs. Quota is per-project and configured in the Google Cloud console; exhaustion surfaces as 429 `RESOURCE_EXHAUSTED`.",
  },
};

export default quota;
