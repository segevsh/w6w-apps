/**
 * How much of Fillout's request-rate allowance is left for this key?
 *
 * ## Why this is a live probe rather than a declared absence
 *
 * Fillout serves the IETF `ratelimit-*` header set on **every** response,
 * measured on 2026-08-11 against `api.fillout.com` and `eu-api.fillout.com`:
 *
 *     ratelimit-limit: 5
 *     ratelimit-policy: 5;w=1
 *     ratelimit-remaining: 4
 *     ratelimit-reset: 1
 *
 * and a `429` adds `retry-after: 1`. A burst of nine requests walked
 * `ratelimit-remaining` down 4→3→2→1→0, answered `429 Too Many Requests
 * {"message":"Too many requests. Try again soon."}`, then reset to 4 — so the
 * counter is real and not decorative. Most vendors in this pack publish a
 * ceiling and no remaining count; Fillout publishes both.
 *
 * ## The number that matters is the ceiling, and it is 5
 *
 * **Five requests per second, per account/API key** — the vendor's own
 * sentence, and the tightest limit in this pack by an order of magnitude. A
 * workflow that fans out over a form's submissions will hit it, and it is the
 * single fact about this API most likely to be discovered the hard way. So the
 * check publishes it whether or not anything is currently constrained.
 *
 * ## What `remaining` does and does not tell you
 *
 * The window is **one second** (`ratelimit-policy: 5;w=1`). By the time a human
 * reads this report the window has closed many times over, so `remaining` is a
 * snapshot of an instant, not a trend — it cannot show sustained pressure the
 * way a monthly allowance can. It is reported because a reading of `0` is
 * genuinely actionable (something else is saturating the key right now), and
 * because the ceiling can only be learned by looking. Anything above zero is
 * `ok`; this check will never manufacture a `degraded` out of a busy instant.
 *
 * ## Signed, and on the app's own host
 *
 * The limit is documented as per account/API key, so an unsigned probe would
 * measure whichever anonymous bucket the gateway picked and report a number
 * that is not this account's. It therefore runs `signed` against
 * `GET /v1/api/forms` — the same endpoint `auth/api-key.ts` probes, for the
 * same reason: it is the only endpoint in Fillout's eight that needs no id and
 * has no side effect. The body is never read, and `minIntervalSeconds: 60`
 * keeps a check that costs one of five requests-per-second to once a minute.
 *
 * A credential failure here is reported `unknown`, not `degraded`: with the key
 * rejected, whatever bucket the gateway counted against is not this account's,
 * and whether the key is any good is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition, HealthQuota, HealthReport } from "@w6w/types";
import {
  API_PREFIX,
  apiHost,
  classifyCredentialMessage,
  regionFromConnection,
} from "../lib/client.ts";

/** Documented ceiling, restated so a report is readable when headers go missing. */
export const DOCUMENTED_LIMIT = 5;

/** The bucket id used in the report. */
export const QUOTA_ID = "requests-per-second";

export interface RateHeaders {
  limit?: number;
  remaining?: number;
  resetSeconds?: number;
  policy?: string;
  retryAfterSeconds?: number;
}

/** Parse an integer header, treating anything unparseable as absent. */
export function intHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null) return undefined;
  const value = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Read the IETF `ratelimit-*` set.
 *
 * Names are the un-prefixed draft spelling Fillout actually sends
 * (`ratelimit-limit`), not the older `x-ratelimit-*` convention — asking for
 * the `x-` form returns nothing here.
 */
export function readRateHeaders(headers: Headers): RateHeaders {
  return {
    limit: intHeader(headers, "ratelimit-limit"),
    remaining: intHeader(headers, "ratelimit-remaining"),
    resetSeconds: intHeader(headers, "ratelimit-reset"),
    policy: headers.get("ratelimit-policy") ?? undefined,
    retryAfterSeconds: intHeader(headers, "retry-after"),
  };
}

/**
 * Turn the headers into a report.
 *
 * Exported so the arithmetic is testable without a fetch — this is the part
 * that decides whether an operator is told their integration is being throttled.
 */
export function reportFromHeaders(rate: RateHeaders, status: number, now: number): HealthReport {
  if (rate.limit === undefined && rate.remaining === undefined) {
    return {
      state: "unknown",
      message: "Fillout returned no ratelimit-* headers, so request-rate headroom is unreadable. " +
        `The documented ceiling is ${DOCUMENTED_LIMIT} requests/second per API key.`,
    };
  }

  const resetSeconds = rate.retryAfterSeconds ?? rate.resetSeconds;
  const quota: HealthQuota = {
    id: QUOTA_ID,
    limit: rate.limit ?? DOCUMENTED_LIMIT,
    remaining: rate.remaining,
    unit: "requests",
    ...(resetSeconds !== undefined
      ? { resetAt: new Date(now + resetSeconds * 1000).toISOString() }
      : {}),
  };

  const window = rate.policy ? ` (policy ${rate.policy})` : "";
  if (status === 429 || rate.remaining === 0) {
    return {
      state: "degraded",
      message: `Fillout is throttling this API key: ${quota.remaining ?? 0}/${quota.limit} ` +
        `requests left in the current window${window}. The limit is per account/API key.`,
      quota: [quota],
      ttlSeconds: 60,
    };
  }

  return {
    state: "ok",
    message: `${quota.remaining ?? "?"}/${quota.limit} requests left in the current ` +
      `one-second window${window}.`,
    quota: [quota],
    ttlSeconds: 60,
  };
}

const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "API request-rate headroom",
  description:
    "Fillout allows 5 requests per second per account/API key and reports the remaining count " +
    "in IETF ratelimit-* headers. Read from GET /v1/api/forms without parsing the body.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const host = apiHost(regionFromConnection(ctx.connection));
    const res = await ctx.fetch(`https://${host}${API_PREFIX}/forms`, {
      headers: { accept: "application/json" },
    });

    if (!res.ok && res.status !== 429) {
      const body = await res.json().catch(() => null) as { message?: unknown } | null;
      if (classifyCredentialMessage(body?.message) !== "other") {
        return {
          state: "unknown",
          message: "Fillout rejected the credential, so the rate counter read belongs to no " +
            "account. See the auth:api-key check.",
        };
      }
      return { state: "unknown", message: `Fillout returned HTTP ${res.status} for /forms` };
    }

    return reportFromHeaders(readRateHeaders(res.headers), res.status, Date.now());
  },
};

export default requestRate;
