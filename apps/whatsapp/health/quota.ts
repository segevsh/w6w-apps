import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declared absent rather than guessed. Researched 2026-07-31:
 *
 *   - The `/{phone-number-id}/messages` endpoint carries no `ratelimit-*` (or
 *     equivalent) response headers the way Zendesk or GitHub expose headroom.
 *   - The nearest field, `whatsapp_business_manager_messaging_limit` on
 *     `GET /{phone-number-id}`, reports a daily-conversation TIER CEILING
 *     (e.g. `TIER_1K` / `TIER_10K` / `TIER_100K` / `TIER_UNLIMITED`) alongside
 *     `quality_rating` — a ceiling, not a live remaining-count, so it does not
 *     fit this check's `quota` shape (`limit` / `remaining` / `resetAt`):
 *     there is no "remaining" to report.
 *   - Per-second throughput (80 messages/sec by default per number, raisable)
 *     is documented but not queryable through any endpoint or header.
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "The messages endpoint carries no rate-limit response headers. The nearest field, " +
      "whatsapp_business_manager_messaging_limit, reports a daily-conversation tier ceiling " +
      "(TIER_1K/10K/100K/UNLIMITED) plus quality_rating — not a live remaining-headroom count, " +
      "so it doesn't fit a limit/remaining/resetAt quota report. Per-second throughput (80 msg/s " +
      "default) is documented but not queryable at all.",
  },
};

export default quota;
