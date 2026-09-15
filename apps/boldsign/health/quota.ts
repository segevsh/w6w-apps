/**
 * API rate-limit headroom.
 *
 * `api-overview/rate-limit` documents an account-wide ceiling — 2000
 * requests/hour on a live key, 50/hour on a sandbox key — "tracked in the API
 * response headers", without naming them. Verified live 2026-09-15 against
 * `api.boldsign.com` with an invalid key:
 *
 * ```
 * GET /v1/does-not-exist        (bad route, so the request is NOT rejected for auth)
 *   -> 404, headers include:
 *      x-rate-limit-limit: "1h"                          (a duration label, not a number)
 *      x-rate-limit-remaining: "1804"
 *      x-rate-limit-reset: "2026-09-15T20:35:17.71…Z"    (ISO 8601)
 * GET /v1/plan/apiCreditsCount  (real route, bad key)
 *   -> 401, NO rate-limit headers at all
 * ```
 *
 * So the headers exist, but only on a request BoldSign actually routes and
 * processes — a request rejected purely for authentication carries none. This
 * app has no way to confirm the headers survive onto a **successful** signed
 * response (no live BoldSign account was available to verify against), so
 * this check is `severity: "informational"` and reports `unknown` rather than
 * `down` whenever they are absent: their absence on a signed call is exactly
 * as likely to mean "not attached to this response shape" as "no quota left".
 *
 * `x-rate-limit-limit`'s value is a duration label ("1h"), not the numeric
 * ceiling — the account's actual limit (2000 vs. 50) is not recoverable from
 * it, so `HealthQuota.limit` is left unset and the label is carried in
 * `message` instead.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { apiHostFrom } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const host = apiHostFrom(ctx.connection);
    const res = await ctx.fetch(`https://${host}/v1/plan/apiCreditsCount`, {
      headers: { accept: "application/json" },
    });
    await res.body?.cancel();

    const remainingHeader = res.headers.get("x-rate-limit-remaining");
    const limitLabel = res.headers.get("x-rate-limit-limit");
    const resetHeader = res.headers.get("x-rate-limit-reset");
    const remaining = remainingHeader !== null ? Number(remainingHeader) : undefined;

    if (remaining === undefined || Number.isNaN(remaining)) {
      return {
        state: "unknown",
        message: "no x-rate-limit-remaining header on this response — see the module doc",
      };
    }

    return {
      state: remaining <= 10 ? "degraded" : "ok",
      message: `${remaining} requests remaining` + (limitLabel ? ` per ${limitLabel}` : ""),
      quota: [{
        remaining,
        resetAt: resetHeader && !Number.isNaN(Date.parse(resetHeader))
          ? new Date(resetHeader).toISOString()
          : undefined,
        unit: "requests",
      }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
