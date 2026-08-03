/**
 * How much headroom is left on THIS credential — MailerLite.
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
 * Probe: `GET /api/subscribers?limit=0`, the same cheap scope-free call the auth
 * `test` hook uses — it returns a bare `{"total": n}` and no subscriber rows.
 *
 * Honesty note, and the reason for the `unknown` branch below: MailerLite
 * documents a global limit of 120 requests/minute and shows
 * `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `Retry-After` — but it shows
 * them only on the 429 response. It does not promise them on a 2xx. So this
 * check reads the headers when they are there and reports `unknown` when they
 * are not, rather than inventing a remaining count from the documented 120.
 * A 429 is handled explicitly, since that is the one response the headers are
 * guaranteed on and the one where the reading matters most.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** MailerLite's `Retry-After` is SECONDS FROM NOW, not an instant. */
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
    "Requests remaining on this credential, read off the `X-RateLimit-*` headers. MailerLite documents them only on a 429, so a healthy response often carries none.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/subscribers?limit=0`);
    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    const resetAt = isoFromDelta(h.get("retry-after"));

    // The one response MailerLite guarantees the counters on.
    if (res.status === 429) {
      return {
        state: "down",
        message: "rate limited — the per-minute allowance is exhausted",
        quota: [{ id: "requests", limit, remaining: remaining ?? 0, resetAt, unit: "requests" }],
        ttlSeconds: 60,
      };
    }
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: "response carried no X-RateLimit-* headers; MailerLite emits them only on a 429",
        ttlSeconds: 60,
      };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{ id: "requests", limit, remaining, resetAt, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
