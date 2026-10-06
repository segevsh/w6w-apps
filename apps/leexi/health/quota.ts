/**
 * Do we have quota left? — not knowable, declared as a positive fact.
 *
 * Leexi documents 50 requests/minute (10/minute for call creation) and answers 429 past
 * it, but publishes no usage endpoint and no `X-RateLimit-*` header: none appeared on the
 * unauthenticated 401/404 responses measured 2026-10-06 (only `x-request-id`,
 * `x-runtime`, Cloudflare and security headers), and the reference documents none on
 * authenticated ones. Headroom only shows up as a 429 after it has been spent.
 *
 * `severity: "informational"` is required: an `unavailable` entry always reports
 * `unknown`, which would otherwise pin the app's verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Leexi documents 50 requests/minute (10/minute for call creation) but exposes no rate-limit headers and no usage endpoint; headroom only shows up as a 429 after it has been exceeded.",
  },
};

export default quota;
