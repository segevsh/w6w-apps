import type { HealthCheckDefinition } from "@w6w/types";
import { HUB, parseRateLimit } from "../lib/client.ts";

/**
 * How much of the Hub's rate limit is left.
 *
 * ## The headers exist and are named nothing like the usual ones
 *
 * Measured on `huggingface.co/api` on 2026-08-18:
 *
 *     ratelimit: "api";r=494;t=170
 *     ratelimit-policy: "fixed window";"api";q=500;w=300
 *
 * That is the IETF structured-fields draft, not `X-RateLimit-*`. Five hundred
 * requests per five minutes, with `r` remaining and `t` seconds to reset. A
 * client looking for the conventional headers finds none and concludes there is
 * nothing to track — which is why this check is worth having rather than
 * declaring an absence.
 *
 * ## It measures the Hub, and the Hub only
 *
 * Inference goes through the router to third-party providers, each with its own
 * limits, reported in its own way or not at all. Nothing here speaks for those,
 * and pretending otherwise would be worse than silence.
 *
 * The probe is a cheap unauthenticated Hub call, so the headers come back
 * without the check signing anything.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Hub request headroom",
  description:
    "Remaining Hub requests in the current window, from the RFC-draft `ratelimit` header rather " +
    "than `X-RateLimit-*`. It says nothing about the inference providers.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      // The cheapest call on the Hub, and it needs no credential.
      res = await ctx.fetch(`${HUB}/api/models?limit=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach the Hub: ${String(err)}` };
    }
    await res.body?.cancel();

    const { remaining, resetsIn, quota: allowance, window } = parseRateLimit(
      res.headers.get("ratelimit"),
      res.headers.get("ratelimit-policy"),
    );

    if (remaining === undefined || allowance === undefined || allowance <= 0) {
      return {
        state: "unknown",
        message: "the Hub did not return its `ratelimit` headers — note these are the RFC-draft " +
          "form, not X-RateLimit-*, and a proxy that only forwards known headers strips them",
      };
    }

    const detail = `${remaining} of ${allowance} Hub requests left` +
      (window ? ` per ${window}s` : "") +
      (resetsIn !== undefined ? `, resetting in ${resetsIn}s` : "");

    if (remaining <= 0) {
      return { state: "down", message: `${detail} — Hub calls are being refused until the reset` };
    }
    if (remaining <= allowance * 0.1) {
      return { state: "degraded", message: detail };
    }
    return { state: "ok", message: detail, ttlSeconds: 300 };
  },
};

export default quota;
