/**
 * How much headroom is left on THIS credential — Help Scout.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will the
 *     next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential,
 *     and reading it needs the credential on the wire. Signing is safe
 *     because the probe stays on the app's own egress allowlist
 *     (`api.helpscout.net`) — this check declares no `network.allow` of its
 *     own, which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /v2/users/me`, the scope-free whoami the auth `test` hook also
 * uses. Verified against developer.helpscout.com/mailbox-api/overview/rate-limiting/:
 * every response carries `X-RateLimit-Limit-Minute` and
 * `X-RateLimit-Remaining-Minute` (plus `X-RateLimit-Retry-After` once
 * throttled). Help Scout meters per account per minute — the number below is
 * an account-level ceiling rather than a promise about any one endpoint. Note
 * write requests (POST/PUT/DELETE/PATCH) cost 2 against this same budget.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
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
  description:
    "Per-minute account allowance remaining, read off the `X-RateLimit-*-Minute` headers on the whoami probe.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/users/me`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit-minute"));
    const remaining = num(h.get("x-ratelimit-remaining-minute"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-*-Minute headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "account",
        limit,
        remaining,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
