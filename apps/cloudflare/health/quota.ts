/**
 * How much headroom is left on THIS credential — Cloudflare.
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
 * Probe: `GET /user/tokens/verify`, the same call the auth `test` hook makes
 * (SendGrid's quota check follows the identical pattern of reusing its
 * cheapest read). Cloudflare returns standard rate-limit headers on every API
 * response as of the 2025-09-03 rollout, in the IETF-draft `RateLimit` /
 * `RateLimit-Policy` syntax — verified 2026-08-01:
 * https://developers.cloudflare.com/changelog/post/2025-09-03-rate-limiting-improvement/
 *
 *   RateLimit: "default";r=50;t=30        (r = remaining, t = seconds to reset)
 *   RateLimit-Policy: "burst";q=100;w=60  (q = total quota, w = window seconds)
 *
 * Cloudflare's platform-wide cap is documented as 1,200 requests / 5 minutes
 * per user, applied cumulatively across dashboard, API key and API token —
 * https://developers.cloudflare.com/fundamentals/api/reference/limits/
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const numMatch = (s: string, key: string): number | undefined => {
  const m = s.match(new RegExp(`${key}=(\\d+)`));
  return m ? Number(m[1]) : undefined;
};

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
  description:
    "Requests remaining on this token, read off the `RateLimit`/`RateLimit-Policy` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user/tokens/verify`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const rateLimit = res.headers.get("ratelimit");
    const policy = res.headers.get("ratelimit-policy");
    if (!rateLimit) {
      return { state: "unknown", message: "response carried no RateLimit header" };
    }

    const remaining = numMatch(rateLimit, "r");
    const resetSeconds = numMatch(rateLimit, "t");
    const limit = policy ? numMatch(policy, "q") : undefined;
    const windowSeconds = policy ? numMatch(policy, "w") : undefined;

    if (remaining === undefined) {
      return { state: "unknown", message: `could not parse RateLimit header: "${rateLimit}"` };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: resetSeconds !== undefined
          ? new Date(Date.now() + resetSeconds * 1000).toISOString()
          : undefined,
        unit: windowSeconds !== undefined ? `requests/${windowSeconds}s` : "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
