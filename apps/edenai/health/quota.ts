/**
 * Credit / quota headroom - declared unavailable.
 *
 * Eden AI is prepaid: every response reports the `cost` of that one call (USD), and an account
 * with no credit fails with a payment error. But nothing readable by an ordinary API key reports
 * the BALANCE: the OpenAPI document (checked 2026-10-06, every path) has no balance or credits
 * endpoint outside the organisation Management API, which needs a separate `manage:read` key this
 * app does not hold; and the rate-limit page documents a flat 10 requests/second per account with
 * no rate-limit response header. Per-call cost is spend, not headroom. A declared absence, with
 * `informational` severity so the permanent `unknown` never pins the app's verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  kind: "quota",
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "An ordinary Eden AI API key can read no credit balance or rate-limit header: the OpenAPI " +
      "document has no balance endpoint outside the Management API (a separate manage:read " +
      "key), and the documented 10 requests/second limit carries no response headers. Each " +
      "call reports the cost it incurred, which is spend rather than what is left " +
      "(verified 2026-10-06).",
  },
};

export default quota;
