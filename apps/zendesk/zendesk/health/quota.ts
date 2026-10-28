/**
 * How much headroom is left on THIS credential — Zendesk.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist (`*.zendesk.com`) — this check
 *     declares no `network.allow` of its own, which the spec forbids alongside a
 *     signed posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /api/v2/users/me.json`, the scope-free whoami the auth `test` hook
 * uses. The subdomain comes from the Connection's redacted display data; it
 * identifies the account, so it belongs to the Connection rather than to a
 * param.
 *
 * Zendesk meters per account per minute, with tighter per-endpoint caps layered
 * on top, so the number below is an account-level ceiling rather than a promise
 * about any one endpoint.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Zendesk's `ratelimit-reset` is SECONDS FROM NOW. */
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
    "Per-minute account allowance remaining, read off the `ratelimit-*` headers. Per-endpoint caps are tighter.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { subdomain?: string };
    if (!display.subdomain) {
      return { state: "unknown", message: "connection records no subdomain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.subdomain)}/users/me.json`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("ratelimit-limit"));
    const remaining = num(h.get("ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no ratelimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "account",
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
