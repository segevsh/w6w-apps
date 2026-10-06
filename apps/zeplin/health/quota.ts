/**
 * How much of the rate limit is left?
 *
 * Probe: signed `GET /v1/users/me`; the verdict is read from the `Zeplin-RateLimit-Limit`,
 * `Zeplin-RateLimit-Remaining` and `Zeplin-RateLimit-Reset` response headers (documented in the
 * vendor's Rate Limiting page: 200 requests per minute per user; the reset is epoch
 * MILLISECONDS). The body holds the account email but no credential, so signing the probe leaks
 * nothing. `kind: "quota"`, signed (the default), no `network.allow` of its own.
 *
 * `degraded` at zero remaining (the next call is refused with 429); otherwise `ok`.
 * `severity: "informational"` — a spent per-minute window is worth showing, never worth failing a
 * verdict over.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate limit headroom",
  description: "Remaining requests in the current per-minute window (200 per user).",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/users/me`, {
      headers: { accept: "application/json" },
    });
    await res.body?.cancel();
    const num = (name: string) => {
      const raw = res.headers.get(name);
      return raw === null || raw.trim() === "" ? NaN : Number(raw);
    };
    const remaining = num("zeplin-ratelimit-remaining");
    const limit = num("zeplin-ratelimit-limit");
    const reset = num("zeplin-ratelimit-reset");
    if (!Number.isFinite(remaining)) {
      return {
        state: "unknown",
        message: res.ok
          ? "response carried no rate-limit headers"
          : `rate-limit probe returned ${res.status}`,
      };
    }
    const entry = {
      id: "requests-per-minute",
      remaining,
      unit: "requests",
      ...(Number.isFinite(limit) ? { limit } : {}),
      ...(Number.isFinite(reset) ? { resetAt: new Date(reset).toISOString() } : {}),
    };
    const message = `${remaining}${Number.isFinite(limit) ? ` of ${limit}` : ""} requests left`;
    if (remaining <= 0) return { state: "degraded", message, quota: [entry] };
    return { state: "ok", message, quota: [entry], ttlSeconds: 60 };
  },
};

export default quota;
