/**
 * How much of Paperform's request-rate allowance is left for this key?
 *
 * ## Why this is a live probe rather than a declared absence
 *
 * Paperform's own "Getting Started" docs name `X-RateLimit-Limit` and `X-RateLimit-Remaining`
 * as riding every response, and measured live on 2026-09-29 they do — including on a bare
 * `GET /v1/forms` with **no** credential at all:
 *
 *     x-ratelimit-limit: 60
 *     x-ratelimit-remaining: 59
 *
 * A burst of ~65 concurrent unauthenticated requests walked `x-ratelimit-remaining` down to 0
 * and got a real `429` back (`text/html`, not JSON — see `lib/client.ts`), carrying
 * `retry-after: 6` and `x-ratelimit-reset: <unix timestamp>` — headers that were **absent**
 * on every non-429 response observed. So the counter is real, the ceiling is a flat
 * 60-requests-per-minute budget (not scoped per Action or per resource, unlike CloudConvert's
 * create-only limiter), and the reset/retry-after pair only shows up once it matters.
 *
 * ## Signed, on this app's one endpoint
 *
 * Paperform documents no `/me`/account endpoint at all (see `auth/api-key.ts`), so this reads
 * the same `GET /v1/forms?limit=1` the auth probe uses — the narrowest real, side-effect-free
 * call in this app's surface. Whether the 60/minute ceiling is genuinely per-key or shared
 * more broadly (an unauthenticated request was throttled by the same counter during scouting)
 * is not fully resolved by Paperform's docs; this check reports what the signed response says
 * either way, since a signed call is the closest reading available of this account's own
 * headroom.
 *
 * A credential failure here is reported `unknown`, not `degraded`: whether the key is any
 * good is the derived `auth:api-key` check's job, and the rate-limit headers still ride even
 * a 401 — reporting a rejected key as a busy quota would be misleading.
 */
import type { HealthCheckDefinition, HealthQuota, HealthReport } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { AUTHENTICATION_ERROR_TYPE } from "../auth/api-key.ts";

/** Documented ceiling, restated so a report is readable when headers go missing. */
export const DOCUMENTED_LIMIT = 60;

export const QUOTA_ID = "requests-per-minute";

export interface RateHeaders {
  limit?: number;
  remaining?: number;
  resetUnix?: number;
  retryAfterSeconds?: number;
}

/** Parse an integer header, treating anything unparseable as absent. */
export function intHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null) return undefined;
  const value = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(value) ? value : undefined;
}

export function readRateHeaders(headers: Headers): RateHeaders {
  return {
    limit: intHeader(headers, "x-ratelimit-limit"),
    remaining: intHeader(headers, "x-ratelimit-remaining"),
    resetUnix: intHeader(headers, "x-ratelimit-reset"),
    retryAfterSeconds: intHeader(headers, "retry-after"),
  };
}

/**
 * Turn the headers into a report. Exported so the arithmetic is testable without a fetch.
 */
export function reportFromHeaders(rate: RateHeaders, status: number): HealthReport {
  if (rate.limit === undefined && rate.remaining === undefined) {
    return {
      state: "unknown",
      message: "Paperform returned no X-RateLimit-* headers, so request-rate headroom is " +
        `unreadable. The documented ceiling is ${DOCUMENTED_LIMIT} requests/minute.`,
    };
  }

  const resetAt = rate.resetUnix !== undefined
    ? new Date(rate.resetUnix * 1000).toISOString()
    : rate.retryAfterSeconds !== undefined
    ? new Date(Date.now() + rate.retryAfterSeconds * 1000).toISOString()
    : undefined;

  const quota: HealthQuota = {
    id: QUOTA_ID,
    limit: rate.limit ?? DOCUMENTED_LIMIT,
    remaining: rate.remaining,
    unit: "requests",
    ...(resetAt ? { resetAt } : {}),
  };

  if (status === 429 || rate.remaining === 0) {
    return {
      state: "degraded",
      message: `Paperform is throttling this key: ${quota.remaining ?? 0}/${quota.limit} ` +
        "requests left in the current one-minute window.",
      quota: [quota],
      ttlSeconds: 60,
    };
  }

  return {
    state: "ok",
    message: `${quota.remaining ?? "?"}/${quota.limit} requests left in the current ` +
      "one-minute window.",
    quota: [quota],
    ttlSeconds: 60,
  };
}

const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  description: "Paperform allows 60 requests per minute and reports the remaining count in " +
    "X-RateLimit-* headers. Read from GET /v1/forms?limit=1 without parsing the body.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/forms?limit=1`, {
      headers: { accept: "application/json" },
    });

    if (!res.ok && res.status !== 429) {
      const body = await res.json().catch(() => null) as { error_type?: string } | null;
      if (body?.error_type === AUTHENTICATION_ERROR_TYPE || res.status === 401) {
        return {
          state: "unknown",
          message: "Paperform rejected the credential, so this rate-limit reading belongs to " +
            "no account. See the auth:api-key check.",
        };
      }
      return { state: "unknown", message: `Paperform returned HTTP ${res.status} for /forms` };
    }

    return reportFromHeaders(readRateHeaders(res.headers), res.status);
  },
};

export default requestRate;
