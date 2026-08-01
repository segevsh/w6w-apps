/**
 * Is there quota left? — LinkedIn publishes nothing an App can read.
 *
 * Verified against LinkedIn's own docs (2026-07): the API Error Handling
 * page documents the `429 Rate Limit` response body shape (`message`,
 * `serviceErrorCode`, `status`) and explicitly says usage is visible only in
 * the Developer Portal's Analytics tab, not via response headers —
 * https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/error-handling
 * and https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits.
 * No `X-RateLimit-*` (or equivalent) response header is documented anywhere
 * in LinkedIn's REST API reference. Per-app/per-endpoint daily limits exist
 * (application + member caps, reset at UTC midnight) but the only way to
 * read them is the Developer Portal UI — nothing this App's sandbox, which
 * only sees API responses, can probe.
 *
 * `severity: "informational"` is set explicitly rather than left at this
 * kind's default (`degraded`): an `unavailable` entry with no probe would
 * otherwise report a permanent `unknown` that could worsen a roll-up
 * forever, which is worse than just saying honestly that no check exists.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "LinkedIn does not expose rate-limit headers or a quota-read endpoint in its API. " +
      "Usage against your app's daily limits is visible only in the LinkedIn Developer " +
      "Portal's Analytics tab.",
  },
};

export default quota;
