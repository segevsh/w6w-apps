/**
 * How much rate-limit headroom is left on THIS credential — NationBuilder.
 *
 * Confirmed against the "API Rate Limit Policy" article
 * (`support.nationbuilder.com/en/articles/9868960`, fetched 2026-09-15,
 * updated May 4th 2026): two independent 250-requests-per-10-seconds limits
 * apply, one per IP address and one per API token, and every response
 * carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`
 * (a Unix timestamp, NOT a delay — unlike, say, Zendesk's `ratelimit-reset`
 * which is seconds-from-now). A 429 additionally carries `Retry-After`
 * (seconds to wait).
 *
 * `kind: "quota"` is a different question from liveness — the derived
 * `auth:*` check answers "is the credential live"; this answers "will the
 * next hundred calls succeed". `credential: "signed"` is this kind's
 * default and correct here: the allowance is scoped to the token, and
 * reading it needs the token on the wire. No `network.allow` is declared —
 * the probe stays on the app's own `*.nationbuilder.com` allowlist.
 *
 * Probe: `GET /api/v2/signups/me`, the same scope-free whoami the auth
 * `test` hooks use, so this check never fails for a correctly-scoped token
 * lacking access to some other resource.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl, slugFromConnection } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** NationBuilder's `RateLimit-Reset` is a Unix timestamp (seconds), not a delay. */
const isoFromUnixSeconds = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(n * 1000).toISOString();
};

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
    "Per-10-second per-token allowance remaining, read off the RateLimit-* headers. A separate " +
    "per-IP limit applies too and is not visible here.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    let slug: string;
    try {
      slug = slugFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no nation slug" };
    }

    const res = await ctx.fetch(`${baseUrl(slug)}/signups/me`);
    const h = res.headers;
    const limit = num(h.get("ratelimit-limit"));
    const remaining = num(h.get("ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "token",
        limit,
        remaining,
        resetAt: isoFromUnixSeconds(h.get("ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 10,
    };
  },
};

export default quota;
