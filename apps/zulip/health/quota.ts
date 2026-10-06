/**
 * How much rate-limit headroom is left on THIS credential?
 *
 * Zulip sets `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` on every API
 * response (zulip.com/api/http-headers) — "the number of additional requests of this type", for
 * the strictest limit that applies; the documented default is 200 requests/minute per user.
 * The probe is `GET /users/me`, the same call the auth `test` makes. `X-RateLimit-Reset` is
 * left unread: the docs call it "the time at which" limits lapse without naming a format.
 *
 * `severity: "informational"`: headroom is context, never a reason to fail a roll-up.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseFromConnection } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.2) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining, read off the X-RateLimit-* headers of a GET /users/me.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no organization subdomain" };
    }

    // Signed by the runtime — no credential handling here.
    const res = await ctx.fetch(`${base}/users/me`, { headers: { accept: "application/json" } });
    await res.text().catch(() => "");
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    if (res.status === 429) {
      return {
        state: "down",
        message: "rate limit exceeded (429)",
        quota: [{ id: "user", limit, remaining: 0, unit: "requests" }],
      };
    }
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }
    return {
      state: headroom(remaining, limit),
      quota: [{ id: "user", limit, remaining, unit: "requests" }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
