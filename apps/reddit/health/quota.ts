import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Rate-limit headroom on this credential, read off `GET /api/v1/me`.
 *
 * Reddit documents `X-Ratelimit-Used` / `X-Ratelimit-Remaining` /
 * `X-Ratelimit-Reset` on every OAuth response
 * (github.com/reddit-archive/reddit/wiki/API#rules, checked 2026-07-31) —
 * one shared bucket per OAuth client, unlike X's per-endpoint 15-minute
 * windows (see the `twitter` app's `health/quota.ts`), so a single probe on
 * the cheapest authenticated call this app already needs
 * (`identity-get`'s endpoint, no params) is a meaningful answer for the
 * whole app, not just that one bucket.
 */
const BUCKET = "oauth-client";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Reads X-Ratelimit-* off GET /api/v1/me. Reddit shares one bucket across all endpoints for a given OAuth client, so this is a whole-app reading.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/api/v1/me`);
    if (!res.ok && res.status !== 429) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const used = res.headers.get("x-ratelimit-used");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    if (remaining === null) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    // Reddit's headers are floats ("59.0"), not integers.
    const remainingNum = Number(remaining);
    const usedNum = used === null ? undefined : Number(used);
    const total = usedNum !== undefined ? usedNum + remainingNum : undefined;
    const state: HealthState = remainingNum <= 0
      ? "down"
      : total !== undefined && total > 0 && remainingNum / total < 0.1
      ? "degraded"
      : "ok";

    return {
      state,
      components: {
        [BUCKET]: {
          state,
          message: `${remainingNum}${total !== undefined ? `/${total}` : ""} remaining`,
        },
      },
      quota: [{
        id: BUCKET,
        limit: total,
        remaining: remainingNum,
        // Reddit's X-Ratelimit-Reset is seconds-until-reset, not a unix
        // timestamp (unlike X's x-rate-limit-reset) — offset from now.
        resetAt: reset ? new Date(Date.now() + Number(reset) * 1000).toISOString() : undefined,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
