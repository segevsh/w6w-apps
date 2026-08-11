/**
 * How much request-rate headroom is left on this token?
 *
 * ## What the vendor documents
 *
 * The v2 reference's Rate Limits page states one ceiling and three headers:
 *
 *  - **50 requests per second, per access token** — the whole limit; there is
 *    no monthly or per-workspace quota in this API.
 *  - `X-RateLimit-Limit` — the maximum allowed in the current window.
 *  - `X-RateLimit-Remaining` — how many are left before throttling.
 *  - `Retry-After` — seconds to wait, sent **only** when already throttled.
 *
 * Exceeding it answers `429` with `{"errors":[{"code":"rate.limitExceeded",…}]}`.
 *
 * ## What could NOT be verified, and why this check is `informational`
 *
 * Every one of those headers is documented in prose only: none of the nine v2
 * OpenAPI documents declares a single response header (measured 2026-08-11 —
 * zero occurrences of `X-RateLimit` across all nine files; the string
 * `Retry-After` appears once in the whole corpus, in the **v1** document).
 * And they could not be observed on the wire either, because every response
 * reachable without a token is a gateway `401`, which carries none of them.
 *
 * So the presence of these headers on a successful, authenticated response is
 * **documented but unmeasured**. This check therefore:
 *
 *  - reports `unknown` — never `ok` — when the headers are absent, because
 *    "no headroom information" is not the same as "plenty of headroom"; and
 *  - carries `severity: "informational"`, so that `unknown` cannot pin the
 *    App's roll-up verdict at `unknown` forever if it turns out Productboard
 *    only emits the headers under some conditions, or not at all.
 *
 * Declaring it `unavailable` instead would be the wrong answer in the other
 * direction: the vendor does publish these headers in its own reference, and a
 * declared absence would stop anyone ever looking.
 *
 * ## The probe
 *
 * `GET /v2/entities/configurations`, the same path the credential probe uses —
 * the cheapest authenticated read in the API that returns no customer data and
 * needs no id. Rate-limit headers are a property of the *token*, not of the
 * endpoint, so any authenticated request answers the question; picking the one
 * that already had to be justified avoids justifying a second.
 *
 * `credential: "signed"` and **no `network.allow`** — this probe stays on the
 * App's own allowlisted API host, which is what keeps the spec's ban on pairing
 * a widened allowlist with a signed posture from ever binding here.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-token.ts";

/** The documented per-token ceiling, used only as a fallback label. */
export const DOCUMENTED_LIMIT_PER_SECOND = 50;

/** Parse a header that should be an integer, tolerating absence and rubbish. */
export function readNumericHeader(res: Response, name: string): number | undefined {
  const raw = res.headers.get(name);
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Turn the two headers into a verdict.
 *
 * Split out from `check` so the thresholds are unit-testable without a network.
 * The 10%/25% bands are this App's choice, not the vendor's — Productboard
 * publishes no guidance on when to start worrying — so they are stated here
 * rather than buried in a conditional.
 */
export function judgeHeadroom(
  limit: number | undefined,
  remaining: number | undefined,
): { state: "ok" | "degraded" | "down" | "unknown"; message: string } {
  if (remaining === undefined || limit === undefined || limit <= 0) {
    return {
      state: "unknown",
      message: "Productboard returned no X-RateLimit-Limit/X-RateLimit-Remaining headers on this " +
        `response. The documented ceiling is ${DOCUMENTED_LIMIT_PER_SECOND} requests/second per ` +
        "access token; the remaining count could not be read.",
    };
  }
  const ratio = remaining / limit;
  const summary = `${remaining} of ${limit} requests remaining in the current window`;
  if (remaining <= 0) return { state: "down", message: `Rate limit exhausted — ${summary}` };
  if (ratio <= 0.1) {
    return { state: "degraded", message: `Rate limit nearly exhausted — ${summary}` };
  }
  if (ratio <= 0.25) return { state: "degraded", message: `Rate limit headroom low — ${summary}` };
  return { state: "ok", message: summary };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  description:
    "Reads X-RateLimit-Limit and X-RateLimit-Remaining from an authenticated read. Productboard " +
    "allows 50 requests/second per access token and meters nothing else. Reports unknown rather " +
    "than ok when the headers are absent — see the module header for why that case is expected.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    // No Authorization header here: `credential: "signed"` means the runtime
    // routes this through the Auth `sign` hook exactly as it does an Action.
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });

    if (res.status === 429) {
      const retryAfter = readNumericHeader(res, "retry-after");
      return {
        state: "down",
        message: "Productboard is already throttling this token (429 rate.limitExceeded)" +
          (retryAfter !== undefined ? `; retry after ${retryAfter}s` : ""),
        quota: [{ id: "requests", remaining: 0, unit: "requests" }],
      };
    }
    if (!res.ok) {
      // A refused read says nothing about headroom — that is the credential
      // check's territory, and guessing here would double-report one failure.
      return { state: "unknown", message: `Quota probe returned HTTP ${res.status}` };
    }

    const limit = readNumericHeader(res, "x-ratelimit-limit");
    const remaining = readNumericHeader(res, "x-ratelimit-remaining");
    const verdict = judgeHeadroom(limit, remaining);

    const buckets: HealthQuota[] = limit === undefined && remaining === undefined
      ? []
      : [{ id: "requests", limit, remaining, unit: "requests" }];

    return { state: verdict.state, message: verdict.message, quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
