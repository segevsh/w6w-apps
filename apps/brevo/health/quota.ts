/**
 * How much headroom is left on THIS credential — Brevo.
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
 * Probe: `GET /v3/account`, the same scope-free call the auth `test` hook uses.
 * Brevo has no headroom endpoint; the counters ride on every response under the
 * vendor-prefixed `x-sib-ratelimit-*` names (SendinBlue, as was).
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Brevo documents its reset header as SECONDS FROM NOW, not an instant. */
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
  description: "Requests remaining on this credential, read off the `x-sib-ratelimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const limit = num(res.headers.get("x-sib-ratelimit-limit"));
    const remaining = num(res.headers.get("x-sib-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-sib-ratelimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: isoFromDelta(res.headers.get("x-sib-ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
