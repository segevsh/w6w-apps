/**
 * How much headroom is left on THIS credential — Mailgun.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will the
 *     next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential,
 *     and reading it needs the credential on the wire. Signing is safe because
 *     the probe stays on the app's own egress allowlist (`api.mailgun.net` /
 *     `api.eu.mailgun.net`) — this check declares no `network.allow` of its
 *     own, which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /v4/domains?limit=1`, the same cheap authenticated call the auth
 * `test` hook makes — it needs no scope of its own. `X-RateLimit-Limit` /
 * `-Remaining` / `-Reset` are documented on Mailgun's API overview page
 * (https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview,
 * verified 2026-07-31); `-Reset` is "Unix milliseconds (UTC) until the limit
 * resets" — an absolute ms-epoch timestamp, not a delta and not seconds like
 * SendGrid's/Zendesk's reset headers, so it converts straight to an ISO date
 * with no arithmetic.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { apiHost, regionFromConnection } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Mailgun's `X-RateLimit-Reset` is an absolute Unix-milliseconds timestamp. */
const isoFromEpochMs = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(n).toISOString();
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
  description: "Requests remaining in this window, read off the `X-RateLimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const host = apiHost(regionFromConnection(ctx.connection));
    const res = await ctx.fetch(`https://${host}/v4/domains?limit=1`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "requests",
        limit,
        remaining,
        resetAt: isoFromEpochMs(h.get("x-ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
