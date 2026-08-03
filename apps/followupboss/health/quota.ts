import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * How much rate-limit headroom is left on THIS credential — Follow Up Boss.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential (and to the
 *     registered system behind it), and reading it needs the credential on the
 *     wire.
 *   - **No `network.allow` of its own** — the spec forbids widening egress
 *     alongside a signed posture, and none is needed: the probe stays on
 *     `api.followupboss.com`, already the app's only allowlisted host.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over. A tenant at 12% headroom is working fine.
 *
 * Probe: `GET /identity`, the same small, permission-free call the auth `test`
 * hook uses. Deliberately not `GET /me`, which returns the caller's own
 * `apiKey` in the response body (see `auth/api-key.ts`); a health check has even
 * less business holding a live credential than a connect hook does.
 *
 * ## What the vendor publishes, and how far it was verified
 *
 * The Rate Limiting page documents four response headers, present on **every**
 * response — "Within every response from our API, the following headers indicate
 * the current limit, remaining requests before reaching the limit, the window of
 * time evaluated in seconds, and the context":
 *
 *     X-RateLimit-Limit: 200
 *     X-RateLimit-Remaining: 156
 *     X-RateLimit-Window: 10
 *     X-RateLimit-Context: global
 *
 * "Rate limiting is enforced by the API and is based on a sliding 10 second
 * window." Exhausting it returns 429 plus a `Retry-After` in seconds.
 *
 * **Stated plainly: the headers were NOT observed on the wire.** Verifying them
 * needs a working API key, and this app was built without a Follow Up Boss
 * account. What *was* checked, on 2026-08-03, is the negative case: an
 * unauthenticated `GET https://api.followupboss.com/v1/identity` returns
 * `401` with `www-authenticate`, `x-content-type-options`, CloudFront headers
 * and **no `X-RateLimit-*` at all** — consistent with rejection happening at the
 * auth layer before the limiter runs, and therefore neither confirming nor
 * refuting the documented behaviour on an authenticated call.
 *
 * The parser is built for that uncertainty rather than around it: absent or
 * unparseable headers yield `state: "unknown"` with a message that names what
 * was missing, never a fabricated reading and never a false `ok`. If Follow Up
 * Boss's headers turn out to be spelled differently, this check says "I could
 * not read them" — which is the correct answer — instead of silently reporting
 * full headroom forever.
 *
 * ## The context matters as much as the number
 *
 * The limit is metered per **context**, not globally, and the response says
 * which one applied: "Any given endpoint will only be subject to one context.
 * For example /v1/events may have an 'events' context, for which there may be
 * stricter limits, requests to this endpoint would not affect other contexts,
 * such as 'global'." The documented defaults for a registered system are
 * `global` 250, `events` (GET) 20, `PUT.people` 25, `notes` 10, and
 * `POST.events` unlimited.
 *
 * So a reading from `/identity` describes the **`global`** bucket, and cannot
 * promise that a note-writing workflow — capped at 10 — has the same headroom.
 * The bucket id is reported as `quota[].id` so the number is never read as more
 * universal than it is.
 *
 * ## Why not `/rateLimit/usage`, the endpoint that exists for exactly this
 *
 * Follow Up Boss publishes two purpose-built endpoints — `GET /rateLimit/limits`
 * (configured ceilings) and `GET /rateLimit/usage` (24-hour rolling totals, plus
 * the ceilings). They look like the obvious choice for a quota check and they
 * are not, for three reasons:
 *
 *  1. **They are partner-only.** Both document "Requires valid `X-System` and
 *     `X-System-Key` request headers" and answer
 *     `403 {"error": "Only registered systems can use this endpoint."}` without
 *     them. Those headers are optional on this app's Connection by design (see
 *     `auth/api-key.ts`), so a check built on them would be permanently broken
 *     for every unregistered user — the majority case for an individual
 *     connecting their own key.
 *  2. **They answer a slightly different question.** `/limits` returns
 *     *configured ceilings*, not remaining allowance — it can tell you the limit
 *     is 250 while you sit at 3 remaining. `/usage` returns 24-hour totals and a
 *     peak hour, which is a usage report, not headroom; its own docs describe it
 *     as "a wider view than the most-recent request" and note the response is
 *     "cached server-side for 30 seconds... design your client to poll at most
 *     once per minute".
 *  3. **The headers are strictly better for this purpose** and cost nothing
 *     extra, since they ride along on a request the check was making anyway.
 *
 * A second check reading `/usage` would be defensible for a registered partner
 * deployment. It is not shipped because it would report `unknown` for most
 * tenants, and an entry that is usually blank teaches an operator to ignore it.
 *
 * ## No `resetAt`
 *
 * `HealthQuota.resetAt` is deliberately left unset even though `X-RateLimit-
 * Window` is read. The limit is a **sliding** 10-second window, so there is no
 * instant at which the allowance resets — synthesising `now + window` would
 * invent a precise-looking timestamp for something that has no reset event. The
 * window length goes in the message instead, where it is true.
 */

/** Fraction of the allowance below which headroom is worth flagging. */
const DEGRADED_BELOW = 0.15;

/** Fraction of the allowance at which throttling is effectively happening. */
const DOWN_BELOW = 0.02;

/**
 * Parse an integer header, returning `undefined` rather than `NaN` or `0`.
 *
 * The distinction is the whole point of this check's honesty: "0 remaining" and
 * "no reading" are opposite facts, and a parser that collapses them turns a
 * missing header into a fabricated outage.
 */
export function parseIntHeader(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Map remaining/limit onto a state. Exported so the thresholds are testable. */
export function quotaState(remaining: number, limit: number): HealthState {
  if (limit <= 0) return "unknown";
  const fraction = remaining / limit;
  if (fraction <= DOWN_BELOW) return "down";
  if (fraction < DEGRADED_BELOW) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Reads the `X-RateLimit-*` headers Follow Up Boss documents on every response, via a single " +
    "`GET /identity`. Reports the `global` bucket — writes to /notes and /events are metered " +
    "separately and more strictly.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/identity`, { headers: { accept: "application/json" } });

    const limit = parseIntHeader(res.headers.get("x-ratelimit-limit"));
    const remaining = parseIntHeader(res.headers.get("x-ratelimit-remaining"));
    const window = parseIntHeader(res.headers.get("x-ratelimit-window"));
    const context = res.headers.get("x-ratelimit-context") ?? undefined;

    // A 429 is a positive reading in its own right: the allowance is gone, and
    // `Retry-After` says for how long. Handled before the generic !ok branch,
    // because "you are being throttled" is exactly what this check exists to
    // report — not an error that prevented it reporting.
    if (res.status === 429) {
      const retryAfter = parseIntHeader(res.headers.get("retry-after"));
      return {
        state: "down",
        message: `rate limited${context ? ` on the \`${context}\` context` : ""}${
          retryAfter !== undefined ? `; retry after ${retryAfter}s` : ""
        }`,
        quota: [{ id: context, limit, remaining: remaining ?? 0, unit: "requests" }],
      };
    }

    if (!res.ok) {
      // `unknown`, not `down`: a probe that could not run says nothing about the
      // allowance. A 401/403 here is a credential story, and the derived
      // `auth:api-key` check is the one that reports it.
      return { state: "unknown", message: `Follow Up Boss returned ${res.status}` };
    }

    if (limit === undefined || remaining === undefined) {
      return {
        state: "unknown",
        message:
          "response carried no readable X-RateLimit-Limit/Remaining headers — the documented " +
          "headers were absent or unparseable",
      };
    }

    return {
      state: quotaState(remaining, limit),
      message: `${remaining}/${limit} requests left on the \`${context ?? "global"}\` context${
        window !== undefined ? ` (sliding ${window}s window)` : ""
      }`,
      quota: [{ id: context ?? "global", limit, remaining, unit: "requests" }],
      ttlSeconds: 10,
    };
  },
};

export default quota;
