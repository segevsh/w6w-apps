/**
 * How much headroom is left on THIS credential — Discord.
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
 * Probe: `GET /users/@me`, the same whoami the auth `test` hook uses.
 *
 * Read the caveat before trusting the number: Discord meters PER ROUTE BUCKET,
 * not per app, so the counters below describe the `/users/@me` bucket and
 * nothing else — a workflow hammering `/channels/{id}/messages` has its own,
 * independent allowance. What this check genuinely reports is (a) the shape of
 * a bucket and (b) the global limit, which is the one that stops everything at
 * once and is signalled by `X-RateLimit-Global`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Discord's reset header is epoch SECONDS, with a fractional part. */
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
    "Requests remaining in the `/users/@me` bucket. Discord meters per route bucket, so this is a sample rather than an app-wide allowance.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/@me`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    // A global limit stops every route at once, so it outranks the bucket.
    const global = h.get("x-ratelimit-global") !== null;

    return {
      state: global ? "down" : headroom(remaining, limit),
      message: global ? "globally rate-limited" : undefined,
      quota: [{
        id: h.get("x-ratelimit-bucket") ?? "users-me",
        limit,
        remaining,
        resetAt: isoFromEpoch(h.get("x-ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
