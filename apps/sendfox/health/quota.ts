/**
 * How many of this account's 60 requests/minute are left?
 *
 * ## Why this is a live probe and not a declared absence
 *
 * SendFox documents the quota **and** the signal: "API requests are limited to
 * **60 requests per minute** per authenticated user. Rate limit status is
 * returned in response headers: `X-RateLimit-Limit` — Maximum requests per
 * minute; `X-RateLimit-Remaining` — Remaining requests in current window;
 * `Retry-After` — Seconds until rate limit resets (only on 429 responses)."
 *
 * So unlike Apify (which sends the ceiling and nothing else) there is a real
 * remaining count to read, and unlike Ticket Tailor there is no reset header on
 * a `200` — which is why no `resetAt` is fabricated here. The window is a
 * rolling minute, so a reading carries its own `ttlSeconds` instead.
 *
 * ## The read is `GET /me`, the same call the credential probe makes
 *
 * It is the one authenticated endpoint with no required parameters and no
 * third-party data in its response, so it is the cheapest authenticated call
 * that can carry the headers. `auth/personal-access-token.ts` probes the same
 * path; the two checks answer different questions from the same read, and
 * `minIntervalSeconds` keeps the cost to one call a minute.
 *
 * The check is `credential: "signed"`, so the host injects the bearer header via
 * the auth `sign` hook exactly as it does for an Action — this module never
 * touches a credential.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/personal-access-token.ts";

/** The authenticated read the rate-limit headers are taken from. */
export const ME_URL = `${API_BASE}${PROBE_PATH}`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  /** Seconds until the limit resets — only sent by SendFox on a 429. */
  retryAfterSeconds?: number;
}

function toNumber(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Read the documented rate-limit headers off a response.
 *
 * `Headers.get` is case-insensitive, so the two spellings the vendor uses
 * (`X-RateLimit-*`) and a proxy's lowercase form are the same lookup.
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitReading {
  return {
    limit: toNumber(headers.get("x-ratelimit-limit")),
    remaining: toNumber(headers.get("x-ratelimit-remaining")),
    retryAfterSeconds: toNumber(headers.get("retry-after")),
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description: "Remaining requests in the current minute, read from the X-RateLimit-Limit and " +
    "X-RateLimit-Remaining headers on an authenticated GET /me.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(ME_URL, { headers: { accept: "application/json" } });
    // A 4xx/5xx here says nothing about rate-limit headroom specifically —
    // `auth:personal-access-token` already covers "is this credential live".
    if (!res.ok) {
      return { state: "unknown", message: `SendFox returned ${res.status} for GET ${PROBE_PATH}` };
    }

    const { limit, remaining, retryAfterSeconds } = parseRateLimitHeaders(res.headers);
    if (limit === undefined || remaining === undefined) {
      return {
        state: "unknown",
        message: "Response carried no X-RateLimit-Limit/X-RateLimit-Remaining headers",
      };
    }

    const reading: HealthQuota = {
      id: "requests",
      limit,
      // Never negative: a rolling window can report 0 rather than a deficit, but
      // clamp anyway so a header that overshoots cannot render as nonsense.
      remaining: Math.max(0, remaining),
      unit: "requests",
      // `Retry-After` is the only reset signal the vendor sends, and only on a
      // 429 — so a `resetAt` appears exactly when the vendor stated one.
      ...(retryAfterSeconds !== undefined
        ? { resetAt: new Date(Date.now() + retryAfterSeconds * 1000).toISOString() }
        : {}),
    };

    // A non-positive ceiling is not a configured quota — report unmetered.
    if (limit <= 0) return { state: "ok", quota: [reading], ttlSeconds: 60 };

    const used = 1 - remaining / limit;
    // Exhausting the window recovers on its own within the minute, so it is
    // `degraded`, never `down`.
    const state = used >= WARN_FRACTION ? "degraded" : "ok";
    return {
      state,
      message: state === "degraded"
        ? `${remaining}/${limit} requests remaining in the current minute`
        : undefined,
      quota: [reading],
      ttlSeconds: 60,
    };
  },
};

export default quota;
