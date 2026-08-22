import type { HealthCheckDefinition } from "@w6w/types";
import { type MastodonConnectionDisplay, normalizeUrl } from "../lib/client.ts";

/**
 * How much of this instance's rate limit is left.
 *
 * ## Mastodon publishes real headers, and the reset is a timestamp
 *
 * Measured against `mastodon.social` on 2026-08-18:
 *
 *     x-ratelimit-limit: 300
 *     x-ratelimit-remaining: 298
 *     x-ratelimit-reset: 2026-08-18T23:20:00.701368Z
 *
 * Note the reset is an **ISO 8601 timestamp**, not the epoch seconds most APIs
 * use. Treating it as a number gives `NaN`, and treating it as seconds-from-now
 * gives a date in the year 2026 plus fifty thousand years.
 *
 * ## The limit is the instance's, and small servers set it far lower
 *
 * 300 per five minutes is `mastodon.social`'s default. A hobby server running
 * on a small box may allow a fraction of that, and there is no way to know
 * except by reading the headers it returns. So this is genuinely worth checking
 * per connection rather than assuming a network-wide figure.
 *
 * The probe is `/api/v2/instance`, which needs no credential — so the headers
 * come back without the check having to sign anything.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  description:
    "Remaining requests in the current window, from this instance's own headers. The limit is " +
    "the server's — a small instance may allow a fraction of what mastodon.social does.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as MastodonConnectionDisplay;
    let base: string;
    try {
      base = normalizeUrl(display.url);
    } catch {
      return { state: "unknown", message: "this connection has no instance URL recorded" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/v2/instance`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the instance: ${String(err)}` };
    }
    await res.body?.cancel();

    const limit = Number(res.headers.get("x-ratelimit-limit") ?? NaN);
    const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? NaN);
    const resetHeader = res.headers.get("x-ratelimit-reset");

    if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0) {
      return {
        state: "unknown",
        message: "this instance does not return rate-limit headers — some do not, and a proxy " +
          "in front can strip them",
      };
    }

    // An ISO timestamp, not epoch seconds — parsing it as a number gives NaN.
    let resetsIn: number | undefined;
    if (resetHeader) {
      const parsed = Date.parse(resetHeader);
      if (!Number.isNaN(parsed)) resetsIn = Math.max(0, Math.round((parsed - Date.now()) / 1000));
    }

    const detail = `${remaining} of ${limit} requests left` +
      (resetsIn !== undefined ? `, window resets in ${resetsIn}s` : "");

    if (remaining <= 0) {
      return { state: "down", message: `${detail} — calls are being refused until the reset` };
    }
    if (remaining <= limit * 0.1) {
      return { state: "degraded", message: detail };
    }
    return { state: "ok", message: detail, ttlSeconds: 300 };
  },
};

export default quota;
