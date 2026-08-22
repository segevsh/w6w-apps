/**
 * How much of the hourly request allowance is left — a **real** reading.
 *
 * Fivetran sends `X-Rate-Limit` and `X-Rate-Limit-Remaining` on responses, and
 * `Retry-After` when it refuses. That makes this an actual quota check rather
 * than a declared absence, which is rarer in this pack than it should be.
 *
 * ## The number that matters is the plan, not the count
 *
 * A **trial** account allows **500** requests an hour. A paid one allows
 * **20,000** — forty times more. A workflow built comfortably against a paid
 * account and then pointed at a trial does not degrade; it stops, part-way
 * through, for the rest of the hour.
 *
 * So the low-water mark here is deliberately generous. On a paid plan, ten
 * percent of twenty thousand is two thousand requests of headroom and there is
 * no hurry; on a trial it is fifty, which is one careless loop.
 *
 * The probe is `GET /v1/account/info` — the cheapest authenticated call, and
 * the one that costs the least of the budget it is measuring.
 *
 * When Fivetran sends no rate-limit header this reports `unknown` rather than
 * guessing, because the alternative — assuming a limit — would produce a
 * confident wrong answer.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_VERSION, BASE_URL } from "../lib/client.ts";

/** Below this fraction of the allowance, say so. */
const LOW_WATER = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  description:
    "Requests left this hour, read from Fivetran's own headers. A trial account allows 500 an " +
    "hour against 20,000 on a paid plan — forty times tighter.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/v1/account/info`, {
        headers: { accept: API_VERSION },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach Fivetran: ${String(err)}` };
    }
    await res.body?.cancel();

    const num = (name: string): number | undefined => {
      const raw = res.headers.get(name);
      if (raw === null || raw.trim() === "") return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    const limit = num("x-rate-limit");
    const remaining = num("x-rate-limit-remaining");
    const retryAfter = num("retry-after");

    if (res.status === 429) {
      return {
        state: "down",
        message: retryAfter !== undefined
          ? `rate limited — Fivetran asks for ${retryAfter}s before the next request`
          : "rate limited",
      };
    }
    if (res.status === 401 || res.status === 403) {
      return { state: "unknown", message: "the API key was rejected" };
    }
    if (!res.ok && limit === undefined) {
      return { state: "unknown", message: `account info returned ${res.status}` };
    }
    if (limit === undefined || remaining === undefined) {
      // Assuming a limit would be a confident wrong answer.
      return {
        state: "unknown",
        message: "Fivetran sent no rate-limit header on this response",
      };
    }

    const quotas: HealthQuota[] = [{
      id: "requests",
      limit,
      remaining,
      unit: "requests/hour",
    }];
    // 500/hour is a trial; 20,000 is a paid plan. Saying which turns a number
    // into a fact somebody can act on.
    const plan = limit <= 1000 ? " (a trial-tier allowance)" : "";
    const message = `${remaining}/${limit} requests left this hour${plan}`;

    if (remaining <= 0) return { state: "down", message, quota: quotas };
    if (remaining / Math.max(1, limit) < LOW_WATER) {
      return { state: "degraded", message: `running low — ${message}`, quota: quotas };
    }
    return { state: "ok", message, quota: quotas, ttlSeconds: 300 };
  },
};

export default quota;
