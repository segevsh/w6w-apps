/**
 * How much headroom is left on THIS credential — ActiveCampaign.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist (`"*"`, since the per-account API
 *     host cannot be enumerated) — this check declares no `network.allow` of
 *     its own, which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /api/3/contacts?limit=1`, the same cheap call the auth `test`
 * hook makes. ActiveCampaign documents a flat 5-requests-per-second-per-account
 * ceiling (developers.activecampaign.com/reference/rate-limits), read off the
 * `RateLimit-Limit` / `RateLimit-Remaining` response headers — there is no
 * documented `RateLimit-Reset` header, only a `Retry-After` sent on an actual
 * 429, so `resetAt` is left unset here.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.2) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Requests remaining this second, read off the `RateLimit-*` headers. ActiveCampaign meters 5 requests/second per account.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { apiUrl?: string };
    if (!display.apiUrl) {
      return { state: "unknown", message: "connection records no apiUrl" };
    }

    // Every ActiveCampaign request is signed by `sign` — no headers to add here.
    const res = await ctx.fetch(`${baseUrl(display.apiUrl)}/contacts?limit=1`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("ratelimit-limit"));
    const remaining = num(h.get("ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{ id: "account", limit, remaining, unit: "requests" }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
