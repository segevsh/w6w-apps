/**
 * How much headroom is left on THIS credential — Okta.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:api-token` check answers "is the credential live"; this answers
 *     "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential,
 *     and reading it needs the credential on the wire. Signing is safe
 *     because the probe stays on the app's own egress allowlist
 *     (`*.okta.com` / `*.oktapreview.com`) — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /api/v1/users?limit=1`, the same cheap authenticated call the
 * auth `test` hook uses. Okta reports both a per-minute org-wide bucket AND a
 * tighter per-endpoint bucket via the same three headers on every response —
 * https://developer.okta.com/docs/reference/rate-limits/ — so the number
 * below is this endpoint's ceiling, not a promise about every endpoint.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Okta's `x-rate-limit-reset` is UTC epoch SECONDS, not a delta. */
const isoFromEpochSeconds = (v: string | null): string | undefined => {
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
  description:
    "Headroom remaining on this call's rate-limit bucket, read off the `x-rate-limit-*` " +
    "headers. Okta layers a per-endpoint cap on top of the org-wide one.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { domain?: string };
    if (!display.domain) {
      return { state: "unknown", message: "connection records no domain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.domain)}/users?limit=1`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-rate-limit-limit"));
    const remaining = num(h.get("x-rate-limit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-rate-limit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "users-list",
        limit,
        remaining,
        resetAt: isoFromEpochSeconds(h.get("x-rate-limit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
