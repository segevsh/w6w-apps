/**
 * How much headroom is left on THIS credential — Netlify.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will
 *     the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential,
 *     and reading it needs the credential on the wire. Signing is safe
 *     because the probe stays on the app's own egress allowlist — this check
 *     declares no `network.allow` of its own, which the spec forbids
 *     alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /user`, the same whoami the auth `test` hook calls (Cloudflare's
 * quota check follows the identical pattern of reusing its cheapest read).
 * Netlify documents rate-limit response headers on every API request, in the
 * classic `X-RateLimit-*` form — verified 2026-08-01 against
 * https://docs.netlify.com/api/get-started/#rate-limiting:
 *
 *   X-RateLimit-Limit: 500
 *   X-RateLimit-Remaining: 56
 *   X-RateLimit-Reset: 1372700873   (Unix seconds, not a delta)
 *
 * Netlify's documented cap is 500 requests/minute for most requests, with
 * stricter limits on deploy operations specifically (3/minute, 100/day) that
 * these headers do not distinguish.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means
 * this state never worsens a roll-up. It is reported honestly anyway so a UI
 * can show why a workflow is about to start getting 429s.
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
  description: "Requests remaining this window, read off the X-RateLimit-* response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const limitHeader = res.headers.get("x-ratelimit-limit");
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    const resetHeader = res.headers.get("x-ratelimit-reset");
    if (remainingHeader === null) {
      return { state: "unknown", message: "response carried no X-RateLimit-Remaining header" };
    }

    const remaining = Number(remainingHeader);
    const limit = limitHeader !== null ? Number(limitHeader) : undefined;
    const resetEpochSeconds = resetHeader !== null ? Number(resetHeader) : undefined;
    if (!Number.isFinite(remaining)) {
      return {
        state: "unknown",
        message: `could not parse X-RateLimit-Remaining header: "${remainingHeader}"`,
      };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
        remaining,
        resetAt: resetEpochSeconds !== undefined && Number.isFinite(resetEpochSeconds)
          ? new Date(resetEpochSeconds * 1000).toISOString()
          : undefined,
        unit: "requests/minute",
      }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
