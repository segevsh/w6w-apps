/**
 * How much headroom is left on THIS credential — Klaviyo.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /api/accounts/`, the same call the auth `test` hook makes.
 * Klaviyo runs separate burst and steady buckets PER ENDPOINT, so the numbers
 * below describe the accounts endpoint rather than an account-wide allowance —
 * useful as a canary, not as a budget.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_REVISION, API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Klaviyo's `RateLimit-Reset` is SECONDS FROM NOW, per the IETF draft header. */
const isoFromDelta = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(Date.now() + n * 1000).toISOString();
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
    "Requests remaining on the accounts endpoint, read off the `RateLimit-*` headers. Klaviyo meters per endpoint.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // Every Klaviyo request is pinned to an API revision; `sign` supplies auth.
    const res = await ctx.fetch(`${API_URL}/accounts/`, {
      headers: { revision: API_REVISION },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("ratelimit-limit"));
    const remaining = num(h.get("ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "accounts",
        limit,
        remaining,
        resetAt: isoFromDelta(h.get("ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
