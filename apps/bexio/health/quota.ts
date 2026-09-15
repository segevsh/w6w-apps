/**
 * How much headroom is left on THIS credential's per-minute rate limit.
 *
 * bexio's "Rate Limiting" section documents company-wide limiting with three
 * response headers: `RateLimit-Limit`, `RateLimit-Remaining`, and
 * `RateLimit-Reset` — where **`RateLimit-Reset` is a DELTA in seconds until
 * the window resets, not an absolute epoch** (unlike, say, ClickUp's
 * `X-RateLimit-Reset`). Getting that wrong renders a reset time either in
 * 1970 or decades in the future.
 *
 * Annotation:
 *   - `kind: "quota"` — a different question from liveness (the derived
 *     `auth:*` check) or from "is the vendor's whole platform up" (`service`).
 *   - `scope: "connection"` / `credential: "signed"` (this kind's defaults):
 *     the limit is company-wide but only readable with a signed request, and
 *     no `network.allow` is declared here — the probe stays on the app's own
 *     egress allowlist, which the spec requires for a signed check.
 *   - `severity: "informational"` — running low is worth surfacing, never
 *     worth failing a verdict over on its own.
 *
 * Probe: the same `GET /2.0/company_profile` call the `auth` `test` hook
 * uses — cheap, needs only the universal `general` scope, and the headers
 * ride on every response regardless of body.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** `RateLimit-Reset` is a DELTA in seconds, so it's added to "now". */
const isoFromDeltaSeconds = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(Date.now() + n * 1000).toISOString();
};

/** Headroom is context, not a verdict — `severity: "informational"` below keeps it that way. */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Per-minute request allowance remaining, read off the RateLimit-* headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/2.0/company_profile`, {
      headers: { accept: "application/json" },
    });
    const h = res.headers;
    const limit = num(h.get("ratelimit-limit"));
    const remaining = num(h.get("ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no RateLimit-* headers" };
    }

    const bucket: HealthQuota = {
      id: "requests",
      limit,
      remaining,
      resetAt: isoFromDeltaSeconds(h.get("ratelimit-reset")),
      unit: "requests",
    };
    return { state: headroom(remaining, limit), quota: [bucket], ttlSeconds: 60 };
  },
};

export default quota;
