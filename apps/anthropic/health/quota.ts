/**
 * How much headroom is left on THIS credential — Anthropic.
 *
 * Annotation:
 *
 *   - `kind: "quota"`, which is a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will the
 *     next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct here: the allowance belongs to the credential, and
 *     reading it needs the credential on the wire. Signing is safe because the
 *     probe stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /v1/models?limit=1`, the same endpoint the auth `test` hook uses.
 * Anthropic has no headroom endpoint; the counters ride on every response, so
 * the cheapest scope-free call is the probe. Two buckets are metered
 * independently — a request-per-minute allowance and a token-per-minute one —
 * and it is normally tokens that run out first.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { ANTHROPIC_VERSION, API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Anthropic's reset headers are RFC 3339 instants already. */
const iso = (v: string | null): string | undefined => {
  if (!v) return undefined;
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
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
    "Requests-per-minute and tokens-per-minute remaining, read off the response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `anthropic-version` is required on every call; `sign` supplies x-api-key.
    const res = await ctx.fetch(`${API_URL}/v1/models?limit=1`, {
      headers: { "anthropic-version": ANTHROPIC_VERSION },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const reqRemaining = num(h.get("anthropic-ratelimit-requests-remaining"));
    const reqLimit = num(h.get("anthropic-ratelimit-requests-limit"));
    const tokRemaining = num(h.get("anthropic-ratelimit-tokens-remaining"));
    const tokLimit = num(h.get("anthropic-ratelimit-tokens-limit"));

    if (reqRemaining === undefined && tokRemaining === undefined) {
      return { state: "unknown", message: "response carried no anthropic-ratelimit-* headers" };
    }

    return {
      // Worst bucket wins: tokens usually run out before requests do.
      state: worstHealthState([
        headroom(reqRemaining, reqLimit),
        headroom(tokRemaining, tokLimit),
      ]),
      quota: [
        {
          id: "requests",
          limit: reqLimit,
          remaining: reqRemaining,
          resetAt: iso(h.get("anthropic-ratelimit-requests-reset")),
          unit: "requests",
        },
        {
          id: "tokens",
          limit: tokLimit,
          remaining: tokRemaining,
          resetAt: iso(h.get("anthropic-ratelimit-tokens-reset")),
          unit: "tokens",
        },
      ],
      ttlSeconds: 60,
    };
  },
};

export default quota;
