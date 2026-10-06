/**
 * API request-rate headroom, read off `X-RateLimit-*` headers.
 *
 * Bob sends `X-RateLimit-Limit`, `-Remaining` and `-Reset` (Unix epoch seconds)
 * on "most endpoints" — measured live: even a 401 from `/v1/company/people/fields`
 * carried `x-ratelimit-limit: 50`. Limits are PER ENDPOINT per minute (people
 * search is 50, the fields metadata endpoint is 50), so this reads the probe
 * endpoint's own bucket and says so; it is not an account-wide figure.
 *
 * Informational: a missing header or a spent bucket on one metadata endpoint
 * must not pin the whole app's verdict.
 */
import type { HealthCheckDefinition, HealthQuota, HealthReport } from "@w6w/types";
import { API_BASE, V1 } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}${V1}/company/people/fields`;
export const WARN_FRACTION = 0.1;

export function parseCount(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseResetAt(raw: string | null): string | undefined {
  const n = parseCount(raw);
  if (n === undefined || n === 0) return undefined;
  const date = new Date(n < 1e12 ? n * 1000 : n);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function readHeadroom(headers: Headers): HealthReport {
  const limit = parseCount(headers.get("x-ratelimit-limit"));
  const remaining = parseCount(headers.get("x-ratelimit-remaining"));
  const resetAt = parseResetAt(headers.get("x-ratelimit-reset"));

  if (remaining === undefined || limit === undefined || limit <= 0) {
    return {
      state: "unknown",
      message: "Bob sent no usable X-RateLimit-Limit / X-RateLimit-Remaining headers",
      ttlSeconds: 60,
    };
  }
  const quota: HealthQuota = {
    id: "fields-metadata-per-minute",
    limit,
    remaining,
    unit: "requests",
    ...(resetAt ? { resetAt } : {}),
  };
  const caption = `${remaining}/${limit} requests remaining this minute on the probe endpoint` +
    (resetAt ? `, resetting at ${resetAt}` : "");
  if (remaining === 0 || remaining / limit <= WARN_FRACTION) {
    return {
      state: "degraded",
      message:
        `Bob's per-endpoint rate limit is ${remaining === 0 ? "exhausted" : "nearly spent"} ` +
        `— ${caption}`,
      quota: [quota],
      ttlSeconds: 30,
    };
  }
  return { state: "ok", message: caption, quota: [quota], ttlSeconds: 60 };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  description:
    "Reads X-RateLimit-Limit / -Remaining / -Reset off a signed GET /v1/company/people/fields. " +
    "Bob limits requests per endpoint per minute (50 for people search), so this reports the " +
    "probe endpoint's bucket, not an account-wide figure.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    // Only the headers matter; do not hold the (large) body.
    await res.body?.cancel().catch(() => {});
    if (res.status === 429) {
      const report = readHeadroom(res.headers);
      return {
        ...report,
        state: "degraded",
        message: `Bob is rate-limiting this probe (429). ${report.message ?? ""}`.trim(),
      };
    }
    if (!res.ok) {
      return {
        state: "unknown",
        message: `Bob returned ${res.status} for the probe, so headroom could not be read`,
      };
    }
    return readHeadroom(res.headers);
  },
};

export default quota;
