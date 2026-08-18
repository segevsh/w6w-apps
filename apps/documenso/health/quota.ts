/**
 * How much of the request allowance is left — Documenso sends it on every
 * response.
 *
 * Measured 2026-08-18 against `app.documenso.com`, even a `400` carries the
 * full set:
 *
 *   x-ratelimit-limit: 1000
 *   x-ratelimit-remaining: 999
 *   x-ratelimit-reset: 1787063580
 *
 * That is more than most APIs in this pack manage, and it is worth reading
 * rather than declaring absent — but the headers are **not declared anywhere in
 * the OpenAPI document**, so this reads what actually arrives and says plainly
 * when nothing does rather than assuming a shape.
 *
 * `x-ratelimit-reset` is epoch **seconds** here, unlike LaunchDarkly's
 * milliseconds — the two are a factor of a thousand apart and both look like a
 * plausible timestamp, which is why it is converted explicitly.
 *
 * A self-hosted Documenso may not rate limit at all, in which case the headers
 * are absent and this reports `unknown` — which is the correct answer, not a
 * fault.
 *
 * `severity: "informational"` because headroom is a capacity fact rather than
 * an outage, and because `unknown` is the steady state on a self-hosted
 * instance.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_PATH, baseUrlFromConnection } from "../lib/client.ts";

/** Below this fraction of the allowance, say so. */
const LOW_WATER = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  description:
    "The rate-limit headers Documenso sends on every response. Absent on a self-hosted " +
    "instance that does not rate limit, which is reported rather than guessed at.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const base = baseUrlFromConnection(ctx.connection);
    const res = await ctx.fetch(`${base}${API_PATH}/envelope?perPage=1`, {
      headers: { accept: "application/json" },
    });

    const num = (name: string): number | undefined => {
      const raw = res.headers.get(name);
      if (raw === null || raw.trim() === "") return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    const limit = num("x-ratelimit-limit");
    const remaining = num("x-ratelimit-remaining");
    // Epoch SECONDS here — LaunchDarkly's equivalent is milliseconds.
    const reset = num("x-ratelimit-reset");

    if (!res.ok && limit === undefined) {
      return { state: "unknown", message: `GET /envelope returned ${res.status}` };
    }
    if (limit === undefined || remaining === undefined) {
      return {
        state: "unknown",
        message:
          "this instance sent no rate-limit headers — a self-hosted Documenso may not rate " +
          "limit at all",
      };
    }

    const quotas: HealthQuota[] = [{
      id: "requests",
      limit,
      remaining,
      unit: "requests",
      resetAt: reset === undefined ? undefined : new Date(reset * 1000).toISOString(),
    }];
    const message = `${remaining}/${limit} requests`;
    if (remaining <= 0) {
      return { state: "degraded", message: `at the limit — ${message}`, quota: quotas };
    }
    if (remaining / Math.max(1, limit) < LOW_WATER) {
      return { state: "degraded", message: `running low — ${message}`, quota: quotas };
    }
    return { state: "ok", message, quota: quotas, ttlSeconds: 300 };
  },
};

export default quota;
