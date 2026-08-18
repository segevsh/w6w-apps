import type { HealthCheckDefinition } from "@w6w/types";
import { serviceFromConnection } from "../lib/client.ts";

/**
 * How much of this PDS's rate limit is left.
 *
 * ## Bluesky publishes real headers, which most of this pack's vendors do not
 *
 * Measured against `bsky.social` on 2026-08-18, on an ordinary unauthenticated
 * call:
 *
 *     ratelimit-limit: 3000
 *     ratelimit-remaining: 2999
 *     ratelimit-reset: 1787090566
 *     ratelimit-policy: 3000;w=300
 *
 * Three thousand requests per five minutes, and every XRPC call carries the
 * current state. So this is a **live** probe rather than a declared absence.
 *
 * ## The other limit — the one that actually strands a connection — is not
 * probed here, deliberately
 *
 * `com.atproto.server.createSession` has its own, far tighter budget. Measured
 * the same day:
 *
 *     ratelimit-policy: 10;w=86400
 *
 * Roughly **ten sign-ins per day**. That is the limit that turns a working
 * integration into a broken one, because an app that authenticates per run
 * exhausts it by lunchtime and then cannot sign in at all — with an error that
 * blames the password.
 *
 * It is not measured, because **measuring it would consume it**: a failed
 * sign-in still counts against the counter, so an hourly probe would spend 24
 * of a budget of 10 and cause the exact outage it was watching for. A check
 * that breaks the thing it monitors is worse than no check.
 *
 * What protects that budget instead is the design in `auth/app-password.ts` —
 * one `createSession` at connect time and `refreshSession` thereafter — and
 * saying so plainly here, where somebody looking at rate limits will read it.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  description:
    "Remaining requests in the current five-minute window, read from the PDS's own rate-limit " +
    "headers. The much tighter sign-in limit is documented rather than probed — probing it " +
    "would consume it.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  // Unauthenticated on purpose: the limit is per-PDS and the probe must not
  // carry the session.
  credential: "context",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let service: string;
    try {
      service = serviceFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection's PDS URL will not parse" };
    }

    let res: Response;
    try {
      // The cheapest call that exists, and it needs no credential.
      res = await ctx.fetch(`${service}/xrpc/com.atproto.server.describeServer`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach the PDS: ${String(err)}` };
    }
    await res.body?.cancel();

    const limit = Number(res.headers.get("ratelimit-limit") ?? NaN);
    const remaining = Number(res.headers.get("ratelimit-remaining") ?? NaN);
    const reset = Number(res.headers.get("ratelimit-reset") ?? NaN);
    const policy = res.headers.get("ratelimit-policy") ?? undefined;

    if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
      return {
        state: "unknown",
        message: "this PDS does not return rate-limit headers — self-hosted servers need not",
      };
    }

    const resetsIn = Number.isFinite(reset)
      ? Math.max(0, Math.round(reset - Date.now() / 1000))
      : undefined;
    const detail = `${remaining} of ${limit} requests left` +
      (policy ? ` (${policy})` : "") +
      (resetsIn !== undefined ? `, window resets in ${resetsIn}s` : "");

    if (remaining <= 0) {
      return { state: "down", message: `${detail} — calls are being refused until the reset` };
    }
    if (remaining <= limit * 0.1) {
      return { state: "degraded", message: detail };
    }
    return { state: "ok", message: detail, ttlSeconds: 300 };
  },
};

export default quota;
