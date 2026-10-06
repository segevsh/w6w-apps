/**
 * How many Rendex credits are left this month?
 *
 * `GET /v1/account` (free, never spends a credit) returns
 * `data.usage = {used, limit, remaining, unlimited, resetsAt}`. Shape per the API reference;
 * on Enterprise `usage.unlimited` is true and the numbers may be null.
 *
 * Running out of credits is a stop (a render answers 429 `USAGE_EXCEEDED`), so a spent pool is
 * `down` and 90% or more used is `degraded`. An unlimited plan, or a missing/non-positive
 * limit, is "no ceiling", not "exhausted". A non-200 is `unknown`: it says nothing of headroom.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const ACCOUNT_URL = `${API_BASE}${API_PREFIX}/account`;
export const WARN_FRACTION = 0.9;

interface AccountBody {
  success?: boolean;
  data?: {
    usage?: {
      used?: number | null;
      limit?: number | null;
      remaining?: number | null;
      unlimited?: boolean;
      resetsAt?: string | null;
    };
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Monthly credit headroom",
  description: "Credits used against the plan's monthly limit, read from GET /v1/account.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(ACCOUNT_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Rendex returned ${res.status} for /v1/account` };
    }
    const body = await res.json().catch(() => null) as AccountBody | null;
    const usage = body?.data?.usage;
    if (!usage || typeof usage !== "object") {
      return { state: "unknown", message: "Account response carried no usage block" };
    }
    if (usage.unlimited === true) {
      return { state: "ok", message: "Unlimited plan", ttlSeconds: 300 };
    }
    const { used, limit } = usage;
    if (typeof used !== "number" || typeof limit !== "number") {
      return { state: "unknown", message: "Account usage carried no numeric used/limit" };
    }
    const q: HealthQuota = {
      id: "credits",
      limit,
      remaining: typeof usage.remaining === "number"
        ? Math.max(0, usage.remaining)
        : Math.max(0, limit - used),
      unit: "credits",
      ...(usage.resetsAt ? { resetAt: usage.resetsAt } : {}),
    };
    if (limit <= 0) return { state: "ok", quota: [q], ttlSeconds: 300 };
    const fraction = used / limit;
    if (fraction >= 1) {
      return {
        state: "down",
        message: `credits at ${used}/${limit} (100%)`,
        quota: [q],
        ttlSeconds: 300,
      };
    }
    if (fraction >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `credits at ${used}/${limit} (${Math.round(fraction * 100)}%)`,
        quota: [q],
        ttlSeconds: 300,
      };
    }
    return { state: "ok", quota: [q], ttlSeconds: 300 };
  },
};

export default quota;
