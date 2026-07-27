/**
 * How much headroom is left on THIS credential — Intercom.
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
 * Probe: `GET /me`, the same scope-free identity call the auth `test` hook uses.
 * Intercom has no headroom endpoint; the counters ride on every response,
 * metered per rate-limit window (a rolling ~10s bucket) as a single request
 * bucket. Header names are contractual: `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (a Unix UTC timestamp in
 * SECONDS of when the window resets).
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL, INTERCOM_VERSION } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Intercom's reset header is a Unix timestamp in SECONDS. */
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
    "Requests remaining in the current rate-limit window, read off the `X-RateLimit-*` response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { accept: "application/json", "intercom-version": INTERCOM_VERSION },
    });
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
      resetAt: isoFromEpochSeconds(h.get("x-ratelimit-reset")),
      unit: "requests",
    };
    return { state: headroom(remaining, limit), quota: [bucket], ttlSeconds: 60 };
  },
};

export default quota;
