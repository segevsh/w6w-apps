/**
 * How much of the per-minute allowance is left — and how much of the burst
 * behind it.
 *
 * Front meters **per company, per minute**, at a rate set by the plan: 50 rpm
 * on Starter, 100 on Professional, 200 on Enterprise (120 for a partner's OAuth
 * app). On top of that sits a **burst allowance** worth 50% of the plan rate,
 * refilled over a rolling ten minutes — which is the part that makes Front's
 * limiter behave unlike the others in this pack. A workflow can run at twice
 * the nominal rate for a short while and then stop dead, because the burst
 * bucket is empty and refills far more slowly than the per-minute one.
 *
 * So this reports **both** buckets rather than the headline number:
 *
 *   x-ratelimit-limit / x-ratelimit-remaining / x-ratelimit-reset
 *   x-ratelimit-burst-limit / x-ratelimit-burst-remaining
 *
 * An empty burst with a full minute allowance is the state worth catching — it
 * looks healthy on the headline number and is about to throttle.
 *
 * Two limits deliberately **not** modelled here, because they are per-endpoint
 * rather than per-connection and no header reports them:
 *
 *   - **Search** runs at 40% of the company rate. `conversation-search` says so
 *     in its own description.
 *   - **Message endpoints** are capped at 5 requests per second *per
 *     conversation or channel* — a fan-out across many conversations is fine,
 *     a loop hammering one is not.
 *
 * `severity: "informational"` because headroom is a capacity fact rather than
 * an outage.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/** Below this fraction of a bucket, say so. */
const LOW_WATER = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  description:
    "Front's per-minute allowance and the 10-minute burst bucket behind it, read from the " +
    "rate-limit headers on a scope-free GET /me.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `/me` needs no scope, so this measures headroom without depending on
    // which boxes were ticked when the token was made.
    const res = await ctx.fetch(`${BASE_URL}/me`, { headers: { accept: "application/json" } });

    const num = (name: string): number | undefined => {
      const raw = res.headers.get(name);
      if (raw === null || raw.trim() === "") return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    const limit = num("x-ratelimit-limit");
    const remaining = num("x-ratelimit-remaining");
    // Epoch SECONDS.
    const reset = num("x-ratelimit-reset");
    const burstLimit = num("x-ratelimit-burst-limit");
    const burstRemaining = num("x-ratelimit-burst-remaining");

    if (!res.ok && limit === undefined) {
      return { state: "unknown", message: `GET /me returned ${res.status}` };
    }
    if (limit === undefined || remaining === undefined) {
      return { state: "unknown", message: "Front sent no rate-limit headers on this response" };
    }

    const quotas: HealthQuota[] = [{
      id: "requests",
      limit,
      remaining,
      unit: "requests",
      resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
    }];
    if (burstLimit !== undefined && burstRemaining !== undefined) {
      quotas.push({
        id: "burst",
        limit: burstLimit,
        remaining: burstRemaining,
        unit: "requests",
      });
    }

    const parts = [`${remaining}/${limit} requests this minute`];
    if (burstLimit !== undefined && burstRemaining !== undefined) {
      parts.push(`${burstRemaining}/${burstLimit} burst`);
    }
    const message = parts.join(" · ");

    const low = (r: number, l: number) => r <= 0 || r / Math.max(1, l) < LOW_WATER;
    // The burst bucket is the one that empties quietly: it refills over ten
    // minutes, so being out of it throttles long after the minute rolls over.
    if (
      low(remaining, limit) ||
      (burstLimit !== undefined && burstRemaining !== undefined && low(burstRemaining, burstLimit))
    ) {
      return { state: "degraded", message: `running low — ${message}`, quota: quotas };
    }
    return { state: "ok", message, quota: quotas, ttlSeconds: 300 };
  },
};

export default quota;
