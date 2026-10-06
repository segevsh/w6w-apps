/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * Two limits exist and neither is observable ahead of time: requests are rate limited "per IP
 * address" with no published figure and no documented rate-limit header (the 429 only shows up
 * after the fact), and each workspace has a submissions quota. `GET /workspaces` returns
 * `submissionsQuota` but no count of submissions used, so remaining headroom cannot be derived.
 *
 * `severity: "informational"` is required, not stylistic: an `unavailable` entry always
 * reports `unknown`, which would otherwise pin the app's verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit and submissions headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Formspark rate limits per IP with no published figure or rate-limit header, and " +
      "the workspace list exposes submissionsQuota but not submissions used, so headroom only " +
      "shows up as a 429 or quota_exceeded after the fact.",
  },
};

export default quota;
