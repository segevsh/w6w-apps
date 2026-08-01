import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Bitly documents that exceeding a rate limit answers HTTP 429 (with error
 * codes like RATE_LIMIT_EXCEEDED / API_USAGE_LIMIT_EXCEEDED), but its docs do
 * not name any response headers carrying remaining-quota headroom (no
 * `Retry-After` / `X-RateLimit-*` documented on the throttled response
 * itself). There are usage-inspection endpoints (`/user/platform_limits`,
 * `/groups/{guid}/feature_usage`), but their response shapes weren't
 * confirmed precisely enough against the vendor's own docs during this build
 * to wire one honestly — see README. Declared absent rather than guessed at,
 * for the same reason as a status feed that doesn't exist: a host should be
 * able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Bitly documents HTTP 429 on rate-limit exhaustion but no response headers naming " +
      "remaining quota. Usage-inspection endpoints exist (/user/platform_limits, " +
      "/groups/{guid}/feature_usage) but their exact response shape wasn't verified against " +
      "the vendor's own docs, so no check is wired rather than guessing at fields.",
  },
};

export default quota;
