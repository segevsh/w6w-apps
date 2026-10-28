import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * How much headroom is left on THIS key — Ollama Cloud.
 *
 * Annotation:
 *
 *   - `kind: "quota"` answers "will the next calls succeed", not "is the vendor
 *     up" (`instance`) and not "is the key live" (the derived `auth:*` check).
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance is per account, and reading it needs
 *     the key on the wire. The probe stays on the app's own egress allowlist
 *     (`ollama.com`), so no `network.allow` is declared here.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /api/tags`, the same scope-free call the auth `test` hook makes.
 * Ollama Cloud has no usage endpoint and its limit headers are not documented,
 * so a response carrying none is reported as `unknown` rather than guessed at.
 * The hourly and daily spellings are both read, so a rename does not turn this
 * into a permanent `unknown`.
 */
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
 * state never worsens a roll-up. It is reported honestly anyway so a UI can show
 * why a workflow is about to start getting 429s.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  description:
    "Requests left in the current Ollama Cloud limit window, read off the response headers when " +
    "the API sends them.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${BASE_URL}/api/tags`);
    await res.body?.cancel();
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    // `ratelimit-*` is the IETF-draft spelling; `x-ratelimit-*` the older one.
    const get = (name: string): string | null => h.get(name) ?? h.get(`x-${name}`);

    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];

    for (const [id, unit] of [["requests", "requests"], ["tokens", "tokens"]] as const) {
      const remaining = num(get(`ratelimit-remaining-${id}`));
      if (remaining === undefined) continue;
      const limit = num(get(`ratelimit-limit-${id}`));
      states.push(headroom(remaining, limit));
      buckets.push({
        id,
        limit,
        remaining,
        resetAt: isoFromDelta(get(`ratelimit-reset-${id}`)),
        unit,
      });
    }

    if (buckets.length === 0) {
      return {
        state: "unknown",
        message: "Ollama Cloud sent no ratelimit-* headers — it does not report usage in-band",
      };
    }

    return { state: worstHealthState(states), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
