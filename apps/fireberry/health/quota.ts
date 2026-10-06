import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Fireberry publishes no readable rate-limit headroom, so this declares
 * `unavailable` rather than pretending to probe one.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin the app at `unknown` forever.
 *
 * Verified 2026-10-06: the vendor's "Rate Limit" page states two org-wide
 * ceilings (100 requests/minute; a daily cap of 500/10,000/25,000/50,000 by
 * Free/Standard/Professional/Enterprise plan, reset 00:00 UTC) and an example 429
 * with no `X-RateLimit-*` or `Retry-After` header and no consumption endpoint.
 * Limits are counted per organisation across every token, and errors count too,
 * so discovering the remaining budget would mean spending it.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Fireberry exposes no remaining-request count. Its rate-limit documentation states only " +
      "fixed ceilings (100 requests/minute per organisation; a daily cap of 500 Free, 10,000 " +
      "Standard, 25,000 Professional, 50,000 Enterprise, reset at 00:00 UTC) and shows a 429 with " +
      "no X-RateLimit-* or Retry-After header and no consumption endpoint. Every request counts, " +
      "including failures, so measuring headroom would spend it.",
  },
};

export default quota;
