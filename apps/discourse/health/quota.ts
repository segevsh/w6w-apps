import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Discourse rate-limits, and publishes no way to read remaining headroom, so
 * this declares `unavailable` with a reason rather than pretending to probe.
 *
 * The limit is real and per-instance. Discourse's rate limiter is configured by
 * site settings the forum's own admin controls — `max_reqs_per_ip_per_minute`,
 * `max_reqs_per_ip_per_10_seconds`, `max_admin_api_reqs_per_minute` and friends
 * — so the allowance is not even a constant across forums. Exceeding it earns a
 * 429 whose body is `{"errors":[…],"error_type":"rate_limit","extras":{"wait_seconds":N}}`.
 *
 * The question a `quota` check has to answer is whether any of that is
 * *readable before you exhaust it*. It is not, and this was verified two ways
 * on 2026-08-03 rather than assumed:
 *
 *  1. **The source names exactly two rate-limit headers, and both are set only
 *     on the rejection.** `lib/middleware/request_tracker.rb` builds
 *     `"Retry-After" => available_in.to_s` and
 *     `"Discourse-Rate-Limit-Error-Code" => error_code` inside the 429 branch.
 *     There is no `RateLimit-*` / `X-RateLimit-*` header anywhere on a
 *     successful response.
 *  2. **A live request confirms it.** `GET https://meta.discourse.org/site/basic-info.json`
 *     returned `server`, `date`, `content-type`, `vary`, `x-frame-options`,
 *     `x-xss-protection`, `x-content-type-options`,
 *     `x-permitted-cross-domain-policies`, `referrer-policy`,
 *     `x-discourse-route`, `cache-control`, `x-request-id`, `cdck-proxy-id`,
 *     `strict-transport-security` — and no allowance header among them.
 *
 * The nearest thing to a readable number is `GET /admin/site_settings.json`,
 * which returns the *configured limits*. That is the denominator, never the
 * remainder; it needs an admin-scoped key, which a correctly-scoped integration
 * key should not have; and reporting a limit as if it were headroom is worse
 * than reporting nothing. A self-counting probe would measure this app's own
 * traffic rather than the credential's actual allowance, since Discourse's
 * buckets are per IP and per user across everything using them.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 * Informational checks never worsen a verdict; they are carried for display.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Discourse sets rate limits per instance via site settings and reveals them only by " +
      "rejecting: `Retry-After` and `Discourse-Rate-Limit-Error-Code` appear on the 429 and " +
      "nowhere else. No successful response carries a remaining-quota header, so headroom " +
      "cannot be read before it runs out.",
  },
};

export default quota;
