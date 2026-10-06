/**
 * Request headroom — read off the response headers, not an endpoint.
 *
 * Document360 documents per-key, per-minute limits in two independent buckets (read and write;
 * Business 120/60, Enterprise and Trial 200/100 — `understanding-rate-limiting`, verified
 * 2026-10-06) and says every 2xx carries `X-RateLimit-Limit` and `X-RateLimit-Remaining` for the
 * request's bucket. A 429 adds `X-RateLimit-Reset` and `Retry-After`.
 *
 * This reads the **read** bucket off a signed `GET /v3/projects?page_size=1` — the same
 * key-free probe the credential test uses. The write bucket is not observable without writing, so
 * it is not reported. A response without the headers is `unknown`, never `ok`. A key without the
 * `ViewProjectSettings` permission gets 403 here, which is also `unknown`: the credential is not
 * the problem, there is just no way to measure.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { apiBase, baseHeaders, resolveRegion } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/** Fraction of the per-minute allowance consumed at which the check reports `degraded`. */
export const WARN_FRACTION = 0.9;

export function readHeaders(headers: Headers): { limit?: number; remaining?: number } {
  const num = (name: string) => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return { limit: num("x-ratelimit-limit"), remaining: num("x-ratelimit-remaining") };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Read-request headroom",
  description:
    "Remaining share of the per-minute read allowance, from X-RateLimit headers on GET /v3/projects.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const region = resolveRegion(ctx.connection);
    const res = await ctx.fetch(`${apiBase(region)}${PROBE_PATH}?page_size=1`, {
      headers: baseHeaders(),
    });
    if (res.status === 429) {
      const retry = res.headers.get("retry-after");
      return {
        state: "down",
        message: `Document360 read rate limit exhausted (HTTP 429)${
          retry ? `, retry after ${retry}s` : ""
        }`,
      };
    }
    if (!res.ok) return { state: "unknown", message: `Document360 returned ${res.status}` };

    const { limit, remaining } = readHeaders(res.headers);
    if (limit === undefined || remaining === undefined) {
      return { state: "unknown", message: "Response carried no X-RateLimit headers" };
    }
    const entry: HealthQuota = { id: "read-per-minute", limit, remaining, unit: "requests" };
    let state: HealthState = "ok";
    let message: string | undefined;
    if (limit > 0 && remaining <= 0) {
      state = "down";
      message = "No read requests remaining this minute";
    } else if (limit > 0 && (limit - remaining) / limit >= WARN_FRACTION) {
      state = "degraded";
      message = `${remaining} of ${limit} read requests remaining this minute`;
    }
    return { state, message, quota: [entry], ttlSeconds: 60 };
  },
};

export default quota;
