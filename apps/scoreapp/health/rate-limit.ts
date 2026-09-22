import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { ACCEPT_JSON } from "../lib/client.ts";
import { PROBE_URL } from "../auth/api-key.ts";

/**
 * How much of this account's ScoreApp request window is left?
 *
 * ## Why this is a real probe and not a declared absence
 *
 * Most apps in this pack have to declare request-rate headroom unavailable
 * because the vendor sends no readable count. ScoreApp does, on **every**
 * response including the unauthenticated ones — verified live on 2026-09-22:
 * six consecutive calls to the six documented paths carried
 * `x-ratelimit-limit: 120` and `x-ratelimit-remaining` counting down
 * `119 → 114`, one per request. So the headroom is genuinely readable and this
 * check reads it rather than declaring it away.
 *
 * ## The doc/wire mismatch, and why neither number is hardcoded
 *
 * The vendor's article says "100 requests per minute per user/IP". The live
 * header says `120`. That is a real mismatch and it is not resolved here by
 * picking a side: the wire value is the source of truth for a reading, so the
 * quota is reported from the headers, and no logic anywhere in this app depends
 * on either number being correct.
 *
 * No reset header was observed on any response, so none is reported —
 * `HealthQuota.resetAt` is a field a check must be able to *state*, and inventing
 * a minute-aligned value from the documentation's "per minute" prose would be a
 * guess presented as data.
 *
 * ## Same request as the credential probe, on purpose
 *
 * This reads the headers off `GET /scorecards?limit=1` — the same call
 * `auth/api-key.ts`'s `test` hook makes. That is deliberate rather than
 * duplicated: it is the shortest documented path, needs no parameters beyond a
 * `limit` that keeps it small, and `minIntervalSeconds` keeps the combined cost
 * to one call a minute against the very window being measured.
 *
 * ## When the credential is refused
 *
 * ScoreApp's rate-limit headers are present even on a `401` (the limiter runs
 * before the auth check — measured live). This check still reports `unknown`
 * there rather than printing the headers: a refused credential says nothing about
 * this connection's headroom, and the derived `auth:api-key` check already owns
 * that failure. Reading a number off a request the API declined would be
 * reporting another connection's (or the IP's) budget as this one's.
 */

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

/** The URL this check and the credential probe share — one source of truth for the `limit=1`. */
export const RATE_LIMIT_URL = PROBE_URL;

export interface RateLimitReading {
  limit?: number;
  remaining?: number;
}

/** Read `x-ratelimit-limit`/`x-ratelimit-remaining` off a `Response`. Exported so the arithmetic is testable. */
export function readRateLimitHeaders(headers: Headers): RateLimitReading {
  const asNumber = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    limit: asNumber("x-ratelimit-limit"),
    remaining: asNumber("x-ratelimit-remaining"),
  };
}

/**
 * Turn a reading into the state it implies. Exported so the threshold logic is
 * testable without a fetch.
 *
 * "Exhausted" is `degraded`, never `down`: a per-minute request window refills on
 * its own, and the documented remedy is to wait for it. Only a vendor whose
 * refusal is unrecoverable inside the run would justify `down` — this is the same
 * convention `apps/apify/health/quota.ts` applies to its non-monthly dimensions.
 */
export function stateFor(reading: RateLimitReading): { state: HealthState; message?: string } {
  const { limit, remaining } = reading;
  if (limit === undefined || remaining === undefined) {
    return { state: "unknown" };
  }
  // A non-positive ceiling is "not configured", not "exhausted".
  if (limit <= 0) return { state: "ok" };

  const left = Math.max(0, remaining);
  const used = Math.max(0, limit - remaining);
  const fraction = used / limit;

  if (left <= 0) {
    return {
      state: "degraded",
      message: `request window exhausted (${used}/${limit}); it refills within the minute`,
    };
  }
  if (fraction >= WARN_FRACTION) {
    return {
      state: "degraded",
      message: `${Math.round(fraction * 100)}% of the request window used (${left}/${limit} left)`,
    };
  }
  return { state: "ok" };
}

const rateLimit: HealthCheckDefinition = {
  key: "rate-limit",
  title: "Request-rate headroom",
  description:
    "x-ratelimit-limit / x-ratelimit-remaining, read off a signed GET /scorecards?limit=1 call — " +
    "the same request the auth:api-key check makes. ScoreApp sends both headers on every " +
    "response, including its 401s.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(RATE_LIMIT_URL, { headers: { accept: ACCEPT_JSON } });
    if (!res.ok) {
      // A refused credential (or a 5xx) says nothing about this connection's
      // headroom, even though the headers are present on ScoreApp's 401s.
      return {
        state: "unknown",
        message: `ScoreApp returned ${res.status} for ${PROBE_URL}`,
      };
    }

    const reading = readRateLimitHeaders(res.headers);
    if (reading.limit === undefined || reading.remaining === undefined) {
      return {
        state: "unknown",
        message: "ScoreApp did not return x-ratelimit-limit/x-ratelimit-remaining on this response",
      };
    }

    const { state, message } = stateFor(reading);
    return {
      state,
      message,
      // `resetAt` is deliberately absent: no reset header was observed on the
      // wire, and the documented "per minute" window is not a value the vendor
      // states per response.
      quota: [{
        id: "requests",
        limit: reading.limit,
        remaining: Math.max(0, reading.remaining),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default rateLimit;
