import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_URL, formatPennylaneError } from "../lib/client.ts";

/**
 * How much of this token's rate-limit window is left?
 *
 * Pennylane meters **25 requests every 5 seconds, per token**
 * (`docs/rate-limiting-1.md`), and — unusually — publishes the three headers on
 * *every* response, not only on the refusal:
 *
 *     ratelimit-limit: 25
 *     ratelimit-remaining: 23
 *     ratelimit-reset: 1770379510     ← Unix seconds
 *
 * Only a `429` adds `retry-after`, which is the vendor's own one-word answer to
 * "when may I try again". There is no plan-usage endpoint anywhere in the
 * Company API v2, so these headers on an ordinary read are the entire quota
 * signal.
 *
 * ## Same call as the credential probe, on purpose
 *
 * `auth/oauth2.ts` also calls `GET /me`. That is deliberate rather than
 * duplication: it is the cheapest authenticated read in the surface, it needs
 * no scope at all (so it works on the narrowest grant a user can give), it
 * never echoes the token, and its response is guaranteed to carry the
 * `ratelimit-*` headers on success. One call answers both "is this token live?"
 * and "how much headroom is left?", and `minIntervalSeconds` keeps it to one
 * call a minute.
 *
 * ## Why `severity: "informational"`
 *
 * The window is five seconds long, so "low headroom" is a normal, transient
 * reading rather than evidence of a problem: a workflow that just issued two
 * dozen calls should not turn a connection amber for the second it takes the
 * window to roll over. Informational keeps the reading visible without letting
 * it speak for the connection's health — and, because an unreadable or missing
 * header reports `unknown` (which outranks `ok` in the roll-up), a vendor that
 * ever stops sending these headers cannot pin every verdict at `unknown`.
 */
export const PROBE_PATH = "/me";

/** The documented ceiling, for the message when the header itself is missing. */
export const RATE_LIMIT_PER_WINDOW = 25;

/** Flag the reading once a fifth of the window is left. */
export const WARN_FRACTION = 0.2;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Requests remaining in the current 5-second window, read from the `ratelimit-limit`, " +
    "`ratelimit-remaining` and `ratelimit-reset` headers on GET /me (25 requests / 5 seconds " +
    "per token).",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      return {
        state: "unknown",
        message: formatPennylaneError(res.status, "GET", PROBE_PATH, raw),
      };
    }

    const limitHeader = res.headers.get("ratelimit-limit");
    const remainingHeader = res.headers.get("ratelimit-remaining");
    const resetHeader = res.headers.get("ratelimit-reset");
    const limit = limitHeader === null ? undefined : Number(limitHeader);
    const remaining = remainingHeader === null ? undefined : Number(remainingHeader);

    if (
      limit === undefined || remaining === undefined || Number.isNaN(limit) ||
      Number.isNaN(remaining)
    ) {
      return {
        state: "unknown",
        message: "GET /me answered but carried no readable ratelimit-limit / ratelimit-remaining " +
          `headers, so headroom against the documented ${RATE_LIMIT_PER_WINDOW} requests / ` +
          "5 seconds cannot be read",
      };
    }

    const resetSeconds = resetHeader === null ? NaN : Number(resetHeader);
    const resetAt = Number.isNaN(resetSeconds)
      ? undefined
      : new Date(resetSeconds * 1000).toISOString();
    const reading: HealthQuota = {
      limit,
      remaining,
      unit: "requests",
      ...(resetAt ? { resetAt } : {}),
    };

    if (remaining <= 0) {
      return {
        state: "down",
        message: `Rate limit exhausted (0/${limit} requests left in this window)`,
        quota: [reading],
        ttlSeconds: 60,
      };
    }
    const fraction = limit > 0 ? remaining / limit : 1;
    if (fraction <= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `Rate limit low: ${remaining}/${limit} requests left in this window`,
        quota: [reading],
        ttlSeconds: 60,
      };
    }
    return {
      state: "ok",
      message: `${remaining}/${limit} requests left`,
      quota: [reading],
      ttlSeconds: 60,
    };
  },
};

export default quota;
