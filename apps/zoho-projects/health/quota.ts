/**
 * Zoho Projects documents a limit but no quota endpoint a check can probe.
 *
 * Checked 2026-10-06 ("API Limits" in the V3 reference): each API may be called 200 times per
 * 2-minute window, per endpoint, and every response carries `RateLimit*` headers — but those
 * describe the one endpoint just called, a health hook never sees response headers, and there is
 * no account-level usage endpoint. Declared as a positive absence rather than a silent gap.
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
    reason: "Zoho Projects limits each API to 200 calls per 2 minutes but exposes no quota " +
      "endpoint; the RateLimit headers are per-endpoint response headers (verified 2026-10-06).",
  },
};

export default quota;
