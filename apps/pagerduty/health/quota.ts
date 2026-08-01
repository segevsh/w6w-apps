/**
 * How much headroom is left on THIS credential — PagerDuty.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` checks answer "is the credential live"; this answers "will
 *     the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct here: the allowance belongs to the
 *     credential, and reading it needs the credential on the wire. Signing
 *     is safe because the probe stays on the app's own egress allowlist —
 *     this check declares no `network.allow` of its own, which the spec
 *     forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /abilities`, the same cheap, scope-free call the auth `test`
 * hooks make. PagerDuty's REST API rate limit is per-token, not per-endpoint,
 * so any authenticated call's headers report the same headroom.
 *
 * Header names verified against PagerDuty's own support docs
 * (https://support.pagerduty.com/main/docs/rest-api-rate-limits, fetched
 * 2026-07-31): `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`
 * (no `X-` prefix — the IETF draft RateLimit-header form). `ratelimit-reset`
 * is documented as "how many seconds to wait before retrying", i.e. a
 * duration, not an epoch timestamp — unlike SendGrid's/GitHub's headers, so
 * it is converted to an absolute `resetAt` by adding it to now.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means
 * this state never worsens a roll-up. Reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
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
  description: "Requests remaining on this credential, read off the `ratelimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/abilities`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("ratelimit-limit"));
    const remaining = num(h.get("ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no ratelimit-* headers" };
    }
    const resetSeconds = num(h.get("ratelimit-reset"));

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: resetSeconds === undefined
          ? undefined
          : new Date(Date.now() + resetSeconds * 1000).toISOString(),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
