/**
 * Rate-limit headroom on this credential — BambooHR publishes none.
 *
 * This is an `unavailable` entry with no `check` hook, which the healthcheck RFC
 * makes a first-class answer: "An entry with `unavailable: { reason }` and no
 * hook ... is a better [answer] than a silent gap." Declaring it honestly is the
 * point; inventing a probe that returns a cheerful `ok` would be worse than
 * saying nothing.
 *
 * ## What was actually looked for, and what is genuinely there
 *
 * BambooHR does throttle. The Technical Overview says so — "API requests can be
 * throttled if BambooHR deems them to be too frequent. Implementations should
 * always be ready for a 503 Service Unavailable response" — and documents the
 * 503 as "Commonly, this is due to rate limiting, and a `Retry-After` header may
 * be available".
 *
 * So there is a limit. What there is NOT is any way to read your headroom
 * *before* you hit it:
 *
 *   - **No documented rate-limit headers.** A search across the Technical
 *     Overview and every endpoint reference page fetched for this app found
 *     exactly one rate-limiting mention, the `Retry-After` line quoted above.
 *     There is no `X-RateLimit-Limit` / `-Remaining` / `-Reset` trio and no
 *     combined `RateLimit` header of the kind Close publishes.
 *   - **No quota or usage endpoint.** Nothing in the 345 reference pages listed
 *     by `documentation.bamboohr.com/llms.txt` reports API consumption.
 *   - **No published numeric limit.** BambooHR states no requests-per-minute
 *     figure; the threshold is discretionary ("if BambooHR deems them to be too
 *     frequent").
 *
 * `Retry-After` only appears once you are ALREADY being throttled, which makes
 * it an error-handling signal rather than a headroom reading. A "quota" check
 * built on it could only ever report `ok` (not currently throttled) or `down`
 * (currently throttled) — which is what the derived `auth:*` liveness check and
 * ordinary request failures already tell you, at the cost of an extra API call
 * per interval against an undocumented budget. That is strictly worse than
 * declaring the gap.
 *
 * `severity: "informational"` is required here rather than cosmetic: an
 * `unavailable` entry reports a permanent `unknown`, and at any higher severity
 * that `unknown` would pin the App's roll-up verdict there forever. The RFC
 * calls this out directly.
 *
 * All verified against documentation.bamboohr.com on 2026-08-03. If BambooHR
 * ever publishes headers or a usage endpoint, replace this entry with a real
 * `check` — the shape is already in the right place.
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
      "BambooHR publishes no rate-limit headers, no usage endpoint and no numeric limit. It " +
      "throttles at its own discretion and signals it only after the fact, with a 503 and an " +
      "optional Retry-After header, so remaining headroom cannot be read before it runs out.",
  },
};

export default quota;
