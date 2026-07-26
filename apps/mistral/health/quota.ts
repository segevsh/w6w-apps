/**
 * How much headroom is left on THIS credential — Mistral.
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
 * Probe: `GET /v1/models`, the same scope-free call the auth `test` hook uses.
 * Mistral has no headroom endpoint; the counters ride on the response, metered
 * per minute in both requests and tokens. Header names are not contractual
 * here, so absence is reported as `unknown` rather than guessed at.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Reset is SECONDS FROM NOW. */
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
  description: "Per-minute request and token allowances remaining, read off the response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v1/models`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];

    // Mistral has shipped both the bare and the suffixed spellings; read either
    // rather than reporting `unknown` over a rename.
    const reqLimit = num(h.get("x-ratelimit-limit-requests") ?? h.get("x-ratelimit-limit"));
    const reqRemaining = num(
      h.get("x-ratelimit-remaining-requests") ?? h.get("x-ratelimit-remaining"),
    );
    if (reqRemaining !== undefined) {
      states.push(headroom(reqRemaining, reqLimit));
      buckets.push({
        id: "requests",
        limit: reqLimit,
        remaining: reqRemaining,
        resetAt: isoFromDelta(h.get("x-ratelimit-reset-requests") ?? h.get("x-ratelimit-reset")),
        unit: "requests",
      });
    }

    const tokLimit = num(h.get("x-ratelimit-limit-tokens"));
    const tokRemaining = num(h.get("x-ratelimit-remaining-tokens"));
    if (tokRemaining !== undefined) {
      states.push(headroom(tokRemaining, tokLimit));
      buckets.push({
        id: "tokens",
        limit: tokLimit,
        remaining: tokRemaining,
        resetAt: isoFromDelta(h.get("x-ratelimit-reset-tokens")),
        unit: "tokens",
      });
    }

    if (buckets.length === 0) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    return { state: worstHealthState(states), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
