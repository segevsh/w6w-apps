/**
 * How much of this store's request quota is left?
 *
 * ## This is a real probe because BigCommerce actually publishes the numbers
 *
 * Most vendors in this pack expose a ceiling and no remaining count, which is
 * why so many of their quota checks are declared absences. BigCommerce is the
 * opposite: every response carries the full picture, documented in the API
 * overview's "BigCommerce-specific response headers" table and again in the rate
 * limits guide.
 *
 *   | Header                        | Meaning                                       |
 *   | ----------------------------- | --------------------------------------------- |
 *   | `X-Rate-Limit-Requests-Quota` | Requests allowed in the current window         |
 *   | `X-Rate-Limit-Requests-Left`  | Requests still available in the current window |
 *   | `X-Rate-Limit-Time-Window-Ms` | Length of the window (30,000 ms)               |
 *   | `X-Rate-Limit-Time-Reset-Ms`  | Milliseconds until the window refreshes        |
 *
 * BigCommerce documents header names as **case-insensitive** ("your application
 * may receive `x-rate-limit-requests-left`"), which is why every read here goes
 * through `Headers.get` rather than an object lookup.
 *
 * ## The quota is the STORE's, not this app's
 *
 * "All apps accessing the store share the store's quota… The available quota for
 * an app adjusts as other clients make or stop requests." So a low reading is a
 * fact about the store — some other integration hammering the catalog will show
 * up here — and the remedy (spread the load, cache, back off) is the same either
 * way. Sized by plan: 450 per 30 s on Pro, 150 per 30 s on Plus and Standard,
 * by resource on sandboxes and Enterprise.
 *
 * ## The probe is the same endpoint as the credential check, on purpose
 *
 * `auth/access-token.ts` probes `/v2/time` too. That is deliberate rather than
 * duplication: the headers are on *every* response, so the cheapest possible
 * request is the correct one to spend, and `/v2/time` is the cheapest thing in
 * the API — one integer, no collection scan. `minIntervalSeconds` keeps the cost
 * at one call a minute, which is 0.7% of a Standard plan's window quota.
 *
 * ## What "not reported" means
 *
 * Enterprise stores on the **Unlimited Rate Plan** have no request rate limits
 * at all, and a response from one need not carry these headers. Absent headers
 * are therefore reported as `unknown` with that reason — not as zero headroom,
 * which would report the least constrained accounts in the fleet as the most
 * exhausted.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { normalizeStoreHash, readRateLimit, storeBase } from "../lib/client.ts";

/** Below this fraction of the window quota, say so. */
export const WARN_FRACTION = 0.2;

/** At or below this fraction, the next burst will start getting 429s. */
export const CRITICAL_FRACTION = 0.05;

/** Turn a reading into a state. Exported so the arithmetic is testable without a fetch. */
export function quotaState(left: number, quota: number): "ok" | "degraded" | "down" {
  if (quota <= 0) return "ok";
  const fraction = left / quota;
  if (fraction <= CRITICAL_FRACTION) return "down";
  if (fraction <= WARN_FRACTION) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request quota headroom",
  description: "Requests left in the store's current 30-second window, read from the " +
    "X-Rate-Limit-Requests-* headers on a GET /v2/time. The quota is shared by every app on the " +
    "store, so a low reading may be someone else's traffic.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { storeHash?: unknown };
    const hash = normalizeStoreHash(display.storeHash);
    if (!hash) return { state: "unknown", message: "connection records no store hash" };

    const res = await ctx.fetch(`${storeBase(hash)}/v2/time`, {
      headers: { accept: "application/json" },
    });

    // A 429 is itself a quota answer, and it still carries the headers — so it is
    // read rather than treated as a failure.
    if (!res.ok && res.status !== 429) {
      return { state: "unknown", message: `BigCommerce returned ${res.status} for /v2/time` };
    }

    const snapshot = readRateLimit(res.headers);
    if (snapshot.left === undefined || snapshot.quota === undefined) {
      return {
        state: "unknown",
        message: "no X-Rate-Limit-Requests-* headers on the response — expected on an Enterprise " +
          "Unlimited Rate Plan store, which has no request rate limit",
      };
    }

    const reading: HealthQuota = {
      id: "requests-per-window",
      limit: snapshot.quota,
      // Never negative: a 429 can report a spent window, and a negative
      // "remaining" renders as nonsense.
      remaining: Math.max(0, snapshot.left),
      unit: "requests",
      ...(snapshot.resetMs !== undefined
        ? { resetAt: new Date(Date.now() + snapshot.resetMs).toISOString() }
        : {}),
    };

    const state = res.status === 429 ? "down" : quotaState(snapshot.left, snapshot.quota);
    const windowSeconds = snapshot.windowMs !== undefined
      ? `${Math.round(snapshot.windowMs / 1000)}s`
      : "window";
    const message = state === "ok" && res.status !== 429
      ? undefined
      : `${snapshot.left}/${snapshot.quota} requests left in the current ${windowSeconds} window` +
        (res.status === 429 ? " (the probe itself was rate-limited)" : "");

    return { state, message, quota: [reading], ttlSeconds: 30 };
  },
};

export default quota;
