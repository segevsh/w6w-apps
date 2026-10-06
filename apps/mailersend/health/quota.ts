/**
 * Daily request quota and per-minute rate-limit headroom, read off a signed response.
 *
 * MailerSend counts EVERY request against a daily quota that resets at midnight UTC
 * (Sandbox and trial 100, Hobby 1,000, Starter 100,000, Professional and Enterprise
 * 500,000) and documents that "two HTTP headers to indicate the quota limit and quota
 * reset time will be returned with every API request": `x-apiquota-remaining` and
 * `x-apiquota-reset` (ISO 8601). The per-minute window is `x-ratelimit-limit` /
 * `x-ratelimit-remaining` (60 on general endpoints).
 *
 * Two honest limits on that:
 *  - The docs show the quota headers only on a 429 example. If a 200 carries none of
 *    them this check reports `unknown`, never an invented count.
 *  - The daily LIMIT is plan-dependent and not in any header, so it is not reported.
 *
 * The probe itself spends one request of the daily quota (and a Hobby account has 1,000),
 * hence the 15-minute floor. `informational`: headroom is context, never a verdict.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** `remaining` is all there is: empty is down, nearly empty is degraded. */
export function headroom(remaining: number): HealthState {
  if (remaining <= 0) return "down";
  if (remaining <= 10) return "degraded";
  return "ok";
}

const iso = (v: string | null): string | undefined => {
  if (!v) return undefined;
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  description:
    "Requests left in today's quota (`x-apiquota-remaining`, resets at midnight UTC) and in the current minute (`x-ratelimit-remaining`), from a signed GET /v1/domains. The probe spends one request.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/domains?limit=10`, {
      headers: { accept: "application/json" },
    });
    const h = res.headers;
    const daily = num(h.get("x-apiquota-remaining"));
    const minuteRemaining = num(h.get("x-ratelimit-remaining"));
    const minuteLimit = num(h.get("x-ratelimit-limit"));

    const buckets: HealthQuota[] = [];
    if (daily !== undefined) {
      buckets.push({
        id: "daily",
        remaining: daily,
        resetAt: iso(h.get("x-apiquota-reset")),
        unit: "requests",
      });
    }
    if (minuteRemaining !== undefined) {
      buckets.push({
        id: "per-minute",
        limit: minuteLimit,
        remaining: minuteRemaining,
        unit: "requests",
      });
    }

    if (res.status === 429) {
      return {
        state: "down",
        message: "rate limited or daily quota exhausted",
        quota: buckets,
        ttlSeconds: 60,
      };
    }
    if (!res.ok) {
      // A scoped token with no domains scope is a 403: valid, but nothing to read here.
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    if (daily === undefined) {
      return {
        state: "unknown",
        message:
          "response carried no x-apiquota-remaining header; MailerSend documents it only in a 429 example",
        quota: buckets,
        ttlSeconds: 60,
      };
    }
    return { state: headroom(daily), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
