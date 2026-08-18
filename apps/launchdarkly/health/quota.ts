/**
 * How much of the request allowance is left — read if LaunchDarkly sends it,
 * and said plainly if it does not.
 *
 * LaunchDarkly rate limits in three ways, all resetting every ten seconds, and
 * documents the headers **in prose only**: verified 2026-08-18, the OpenAPI
 * document declares no rate-limit header as a response header on any of its
 * 250 paths, while its own description carries three markdown tables naming
 * them. So this app cannot promise the headers arrive, and does not pretend to.
 *
 * **Only the global pair is about the account.** `X-Ratelimit-Global-Limit`
 * and `X-Ratelimit-Global-Remaining` are shared by every token on the account —
 * LaunchDarkly's own note: *"exceeding the limit with one access token will
 * impact other tokens"*. The route-level pair describes whichever endpoint was
 * just called and says nothing about the next one, so it is reported as
 * context rather than as the verdict.
 *
 * The probe is `GET /projects?limit=1`, the same cheap read the connection test
 * uses. LaunchDarkly's own advice is to *"rely on the headers described below,
 * rather than hardcoding the current limits"*, so nothing here assumes a
 * number.
 *
 * `severity: "informational"` because a ten-second window is not an outage —
 * an account at its limit recovers by itself in ten seconds — and because the
 * steady state when the headers are absent is `unknown`, which at any other
 * severity would pin the App's verdict forever.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_PATH, readRateLimit, resolveHost } from "../lib/client.ts";

/** Below this fraction of the global allowance, say so. */
const LOW_WATER = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  description:
    "The global rate-limit headers, if LaunchDarkly sends them. They are documented in prose " +
    "but declared on no response in the OpenAPI document, so their absence is reported rather " +
    "than guessed at.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const host = resolveHost(ctx.connection);
    const res = await ctx.fetch(`${host}${API_PATH}/projects?limit=1`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `GET /projects returned ${res.status}` };
    }

    const rate = readRateLimit(res.headers);
    const quotas: HealthQuota[] = [];
    if (rate.globalLimit !== undefined || rate.globalRemaining !== undefined) {
      quotas.push({
        id: "global-per-10s",
        limit: rate.globalLimit,
        remaining: rate.globalRemaining,
        unit: "requests",
        // The reset is epoch MILLISECONDS, unlike most APIs' seconds.
        resetAt: rate.resetAt === undefined ? undefined : new Date(rate.resetAt).toISOString(),
      });
    }
    if (rate.routeLimit !== undefined || rate.routeRemaining !== undefined) {
      quotas.push({
        id: "route-per-10s",
        limit: rate.routeLimit,
        remaining: rate.routeRemaining,
        unit: "requests",
      });
    }

    if (rate.globalRemaining === undefined || rate.globalLimit === undefined) {
      return {
        state: "unknown",
        message: "LaunchDarkly sent no global rate-limit headers on this response — they are " +
          "documented but not guaranteed, so there is nothing to report",
        quota: quotas.length ? quotas : undefined,
      };
    }

    const message = `global: ${rate.globalRemaining}/${rate.globalLimit} requests per 10s`;
    if (rate.globalRemaining <= 0) {
      return { state: "degraded", message: `at the limit — ${message}`, quota: quotas };
    }
    if (rate.globalRemaining / Math.max(1, rate.globalLimit) < LOW_WATER) {
      return { state: "degraded", message: `running low — ${message}`, quota: quotas };
    }
    return { state: "ok", message, quota: quotas, ttlSeconds: 300 };
  },
};

export default quota;
