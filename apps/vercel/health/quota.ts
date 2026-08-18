/**
 * How much headroom is left on THIS credential — Vercel.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` checks answer "is the credential live"; this answers "will the
 *     next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential,
 *     and reading it needs the credential on the wire. This check declares no
 *     `network.allow` of its own — which the spec requires alongside a signed
 *     posture — so it stays on the app's own egress.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /v2/user`, the same scope-free whoami the auth `test` hooks use.
 * Vercel publishes no headroom endpoint; the counters ride on responses.
 *
 * Header names are Vercel's own, from its REST API docs (fetched 2026-08-18):
 * "Rate limits are specified via response headers: `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining`, and `X-RateLimit-Reset`."
 *
 * **What the docs do not say is what unit `Reset` is in**, and an
 * unauthenticated call does not carry the headers at all (verified 2026-08-18:
 * the 403 from `GET /v2/user` has no `x-ratelimit-*`), so the unit could not be
 * settled by observation either. Rather than guess one and render a wrong
 * timestamp, the value is classified by magnitude: epoch milliseconds, epoch
 * seconds, or a delay in seconds from now. All three collapse to the same
 * `resetAt` when the guess is right, and the ranges do not overlap for any
 * plausible value.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Interpret `X-RateLimit-Reset` without assuming a unit it never documents.
 * A value past ~2001 in milliseconds (1e12) is a millisecond epoch; past
 * ~2001 in seconds (1e9) is a second epoch; anything smaller is a duration.
 */
export function resetAtFrom(value: number | undefined, now: number): string | undefined {
  if (value === undefined || value <= 0) return undefined;
  if (value > 1e12) return new Date(value).toISOString();
  if (value > 1e9) return new Date(value * 1000).toISOString();
  return new Date(now + value * 1000).toISOString();
}

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. Reported honestly anyway so a UI can show why
 * a workflow is about to start getting 429s.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining on this credential, read off the `x-ratelimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v2/user`, { headers: { accept: "application/json" } });
    // The headers ride on the response whether or not it succeeded, so read
    // them first and only fall back to `unknown` when they are truly absent.
    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return res.ok
        ? { state: "unknown", message: "response carried no x-ratelimit-* headers" }
        : { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: resetAtFrom(num(h.get("x-ratelimit-reset")), Date.now()),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
