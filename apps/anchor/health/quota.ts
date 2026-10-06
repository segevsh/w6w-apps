import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const QUOTA_URL = `${API_BASE}/me`;

/** Flag when the remaining share of the window drops to this fraction or below. */
export const WARN_FRACTION = 0.1;

/**
 * Rate-limit headroom, read from the IETF `RateLimit-*` headers Anchor puts on
 * every response (measured live 2026-10-06: `ratelimit-policy: 2000;w=60`,
 * `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset` in seconds).
 *
 * The developer docs state 200 requests/minute; the wire says 2000 per minute
 * for a request that carries an `Anchor-User-Email` header and 50 for one that
 * does not. The check reports what the headers say, not what the page says.
 *
 * The probe itself is one `GET /me` per interval and is counted by the window.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining in the current rate-limit window, from GET /me headers.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(QUOTA_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Anchor returned ${res.status} for /me` };
    }
    await res.body?.cancel().catch(() => {});

    const limit = Number(res.headers.get("ratelimit-limit"));
    const remaining = Number(res.headers.get("ratelimit-remaining"));
    const reset = Number(res.headers.get("ratelimit-reset"));
    if (
      !res.headers.get("ratelimit-limit") || !res.headers.get("ratelimit-remaining") ||
      !Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0
    ) {
      return { state: "unknown", message: "Anchor sent no RateLimit headers" };
    }

    const entry: HealthQuota = {
      id: "requests-per-window",
      limit,
      remaining,
      unit: "requests",
      ...(Number.isFinite(reset) && res.headers.get("ratelimit-reset")
        ? { resetAt: new Date(Date.now() + reset * 1000).toISOString() }
        : {}),
    };
    if (remaining <= 0) {
      return { state: "degraded", message: "Rate limit exhausted", quota: [entry], ttlSeconds: 60 };
    }
    if (remaining / limit <= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${remaining} of ${limit} requests left in this window`,
        quota: [entry],
        ttlSeconds: 60,
      };
    }
    return { state: "ok", quota: [entry], ttlSeconds: 60 };
  },
};

export default quota;
