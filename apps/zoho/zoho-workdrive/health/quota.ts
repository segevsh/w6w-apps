/**
 * WorkDrive publishes no per-response quota or rate-limit header this app can read.
 *
 * Checked 2026-10-06: the getting-started pages (`getting-started-http-status-code`,
 * `-request-header`, `-pagination`, `-request-and-response-structure`) document no
 * `X-RateLimit-*` response header, and a live unauthenticated `GET /users/me` carried none
 * either. Declared as a positive absence rather than a silent gap.
 *
 * `severity: "informational"` is required: an `unavailable` check reports `unknown`, which
 * outranks `ok` in the roll-up and would pin the App's verdict forever at any other severity.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API call headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Zoho WorkDrive documents no rate-limit or quota response header to probe " +
      "(verified 2026-10-06).",
  },
};

export default quota;
