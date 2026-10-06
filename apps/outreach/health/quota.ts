import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { runProbe } from "../lib/probe.ts";

/** Below this fraction of the hourly allowance remaining, report degraded. */
export const WARN_FRACTION = 0.1;

/**
 * Outreach rate-limits per USER at 10,000 requests per hour and says every
 * response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
 * `X-RateLimit-Reset` (getting-started, "Rate Limiting"). This reads them off
 * the cheap credential probe, signed, on the app's own host.
 *
 * It judges headroom only — never the credential. A 401 therefore reports
 * `unknown` and points at the `auth:*` check, so an expired token is not
 * misreported as a quota problem.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Remaining requests in the current per-user hourly window (10,000/hour), from the X-RateLimit-* response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "degraded",

  async check(_input, ctx) {
    const { response } = await runProbe(ctx);
    if (response.status === 401) {
      return {
        state: "unknown",
        message: "Credential rejected; headroom unreadable. See the auth check.",
      };
    }
    if (response.status === 429) {
      return { state: "degraded", message: "Outreach is rate limiting this user (429)." };
    }
    const limit = Number(response.headers.get("x-ratelimit-limit"));
    const remainingRaw = response.headers.get("x-ratelimit-remaining");
    const remaining = remainingRaw === null ? NaN : Number(remainingRaw);
    if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(remaining)) {
      return {
        state: "unknown",
        message: `No X-RateLimit headers on the response (HTTP ${response.status}).`,
      };
    }
    // The reset header's format is not documented beyond "when the counter will
    // reset", so it is reported only when it parses as a timestamp.
    const resetRaw = response.headers.get("x-ratelimit-reset");
    const parsed = resetRaw ? Date.parse(resetRaw) : NaN;
    const reading: HealthQuota = { id: "hourly-requests", limit, remaining, unit: "requests" };
    if (Number.isFinite(parsed)) reading.resetAt = new Date(parsed).toISOString();

    const state: HealthState = remaining / limit <= WARN_FRACTION ? "degraded" : "ok";
    return {
      state,
      message: state === "ok" ? undefined : `${remaining} of ${limit} requests left this hour.`,
      quota: [reading],
    };
  },
};

export default quota;
