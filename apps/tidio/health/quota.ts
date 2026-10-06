import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { ACCEPT, API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/client-credentials.ts";

/**
 * Request-rate headroom from `x-ratelimit-limit` / `x-ratelimit-remaining`.
 *
 * The rate-limit guide (`developers.tidio.com/docs/openapi-rate-limiting.md`) documents those
 * two response headers and a per-project window of one minute: 60 requests on Plus, 120 on
 * Premium (10 for the Products endpoints on lower plans). This probe reads them off `GET /project`.
 * The headers are documented but were not observed on a signed response (no credential was
 * available when this app was written), so a response without them reports `unknown`, and the
 * check is `informational` so that never pins the app's verdict.
 *
 * The window is a minute and recovers by itself, so exhaustion is `degraded`, never `down`.
 */
export const WARN_FRACTION = 0.9;

function num(v: string | null): number | undefined {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description: "Reads x-ratelimit-limit / x-ratelimit-remaining from GET /project (per-project, " +
    "one-minute window; 60 requests on Plus, 120 on Premium).",
  kind: "quota",
  severity: "informational",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, { headers: { accept: ACCEPT } });
    await res.body?.cancel();
    if (!res.ok && res.status !== 429) {
      return { state: "unknown", message: `Tidio returned ${res.status} for ${PROBE_PATH}` };
    }
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    if (limit === undefined || remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }
    const q: HealthQuota = {
      id: "requests-per-minute",
      limit,
      remaining: Math.max(0, remaining),
      unit: "requests",
    };
    if (res.status === 429 || remaining <= 0) {
      return {
        state: "degraded",
        message: `rate limit exhausted (0/${limit}); the window is one minute`,
        quota: [q],
        ttlSeconds: 60,
      };
    }
    if (limit > 0 && 1 - remaining / limit >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${remaining}/${limit} requests left in the current minute`,
        quota: [q],
        ttlSeconds: 60,
      };
    }
    return { state: "ok", quota: [q], ttlSeconds: 60 };
  },
};

export default quota;
