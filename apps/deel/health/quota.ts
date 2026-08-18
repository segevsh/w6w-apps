/**
 * How much headroom is left on THIS credential — Deel.
 *
 * Deel reports rate-limit state on **every** response, including error ones,
 * so this is a live check rather than a declared absence. Verified live
 * 2026-08-18 against an unauthenticated `GET /rest/contracts`, whose 401 still
 * carried:
 *
 *   x-ratelimit-limit: 5
 *   x-ratelimit-remaining: 4
 *   x-ratelimit-reset: 1787044307
 *
 * `reset` is an absolute **epoch-seconds** timestamp (the observed value was a
 * wall clock a few seconds ahead), not a duration — so it is converted
 * directly rather than added to now. The `5` above is the *unauthenticated*
 * allowance; an authenticated token's ceiling is its own and is read from the
 * same headers.
 *
 * Annotation:
 *
 *   - `kind: "quota"`, `scope: "connection"`, `credential: "signed"` — the
 *     allowance belongs to the credential, and reading it needs the credential
 *     on the wire. No `network.allow` is declared, which the spec requires
 *     alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /contracts?limit=1`, the same cheap call the auth `test` hook
 * makes. Deel's limits are per-token rather than per-endpoint, so any
 * authenticated call reports the same headroom.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { resolveBase } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

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
  description:
    "Requests remaining on this token, read off the `x-ratelimit-*` headers Deel sends on " +
    "every response.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${resolveBase(ctx.connection)}/contracts?limit=1`, {
      headers: { accept: "application/json" },
    });

    // The headers ride on every response including errors — which is exactly
    // when they matter — so they are read before the status is considered.
    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return res.ok
        ? { state: "unknown", message: "response carried no x-ratelimit-* headers" }
        : { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    const reset = num(h.get("x-ratelimit-reset"));

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        // Epoch seconds, not a duration — converted directly.
        resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
