import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Rate-limit headroom, read off a one-row product listing.
 *
 * The reference states that responses to authenticated requests carry
 * `RateLimit-Limit` (the per-minute allowance for the plan: 120 or 240),
 * `RateLimit-Remaining` and `RateLimit-Reset` (seconds until the fixed 60-second
 * window resets). The limit is per marketplace, shared by every API key. The
 * headers were documented, not observed: no key was available.
 *
 * Declared `informational`: a low count is worth knowing but is not evidence
 * anything is broken. The call is made on the app's own host, signed.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}/products?limit=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach ${API_BASE}: ${String(err)}` };
    }
    await res.body?.cancel();

    const limit = Number(res.headers.get("ratelimit-limit"));
    const remainingHeader = res.headers.get("ratelimit-remaining");
    const remaining = Number(remainingHeader);
    const reset = Number(res.headers.get("ratelimit-reset"));
    if (
      !res.headers.get("ratelimit-limit") || remainingHeader === null || !Number.isFinite(limit)
    ) {
      return {
        state: "unknown",
        message: `SamCart returned no RateLimit-* headers (HTTP ${res.status})`,
      };
    }

    const ratio = limit > 0 && Number.isFinite(remaining) ? remaining / limit : 1;
    const state: HealthState = ratio < 0.05 ? "degraded" : "ok";
    const hasReset = Number.isFinite(reset) && res.headers.get("ratelimit-reset") !== null;
    return {
      state,
      message: `${remaining} of ${limit} requests remaining this minute` +
        (hasReset ? `, resets in ${reset}s` : ""),
      quota: [{
        id: "requests-per-minute",
        limit,
        remaining: Number.isFinite(remaining) ? remaining : undefined,
        resetAt: hasReset ? new Date(Date.now() + reset * 1000).toISOString() : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
