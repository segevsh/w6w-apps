/**
 * How much headroom is left on THIS credential — ClickUp.
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
 * Probe: `GET /user`, the same scope-free call the auth `test` hooks use.
 * ClickUp meters per minute per token (100/min on Free–Business, 1,000 on
 * Business Plus, 10,000 on Enterprise) and rides the counters on EVERY response
 * as `X-RateLimit-Limit` / `-Remaining` / `-Reset`, where `-Reset` is an
 * ABSOLUTE Unix epoch in seconds (not a delta). Absence is reported as
 * `unknown` rather than guessed at.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Reset is an ABSOLUTE Unix epoch in SECONDS. */
const isoFromEpoch = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(n * 1000).toISOString();
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
  description: "Per-minute request allowance remaining, read off the response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    const bucket: HealthQuota = {
      id: "requests",
      limit,
      remaining,
      resetAt: isoFromEpoch(h.get("x-ratelimit-reset")),
      unit: "requests",
    };
    return { state: headroom(remaining, limit), quota: [bucket], ttlSeconds: 60 };
  },
};

export default quota;
