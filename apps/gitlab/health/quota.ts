/**
 * How much headroom is left on THIS credential — GitLab.
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
 *     posture. The base URL is resolved from the Connection, so a self-managed
 *     probe stays on that connection's allowlisted host.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /user`, the same scope-free whoami the auth `test` hook uses.
 * GitLab has no headroom endpoint; the counters ride on every response as the
 * RFC-draft `RateLimit-*` headers (no `x-` prefix), documented at
 * docs.gitlab.com/administration/settings/user_and_ip_rate_limits. GitLab.com
 * meters per MINUTE; `RateLimit-Reset` is a Unix epoch second.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { apiBaseFromConnection } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** GitLab's `RateLimit-Reset` is a Unix epoch SECOND. */
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
  description:
    "Per-minute request allowance remaining on this credential, read off GitLab's `RateLimit-*` response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${apiBaseFromConnection(ctx)}/user`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const limit = num(res.headers.get("ratelimit-limit"));
    const remaining = num(res.headers.get("ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: isoFromEpoch(res.headers.get("ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
