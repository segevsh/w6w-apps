/**
 * How much headroom is left on THIS credential — Sentry.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` checks answer "is the credential live"; this answers "will the
 *     next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and
 *     reading it needs the credential on the wire. This check declares no
 *     `network.allow` of its own — which the spec requires alongside a signed
 *     posture — so it stays on the app's own egress.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /api/0/organizations/{slug}/?detailed=0`, the same cheap
 * `org:read` call the `auth-token` `test` hook makes. Sentry has no dedicated
 * headroom endpoint; the counters ride on every response.
 *
 * Header names verified live on 2026-08-18 against
 * `https://us.sentry.io/api/0/organizations/` (they are present even on the
 * unauthenticated 401):
 *
 *   x-sentry-rate-limit-limit: 40
 *   x-sentry-rate-limit-remaining: 39
 *   x-sentry-rate-limit-reset: 1787019075
 *   x-sentry-rate-limit-concurrentlimit: 25
 *   x-sentry-rate-limit-concurrentremaining: 24
 *
 * `reset` is an absolute epoch-SECONDS timestamp (the value above is a wall
 * clock a minute into the future), not a duration — unlike PagerDuty's, so it
 * is converted directly rather than added to now. Sentry meters requests AND
 * in-flight concurrency separately, so both are reported: exhausting either
 * one is what produces a 429.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_PREFIX, resolveBaseUrl, type SentryConnectionDisplay } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. Reported honestly anyway so a UI can show why
 * a workflow is about to start getting 429s.
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
  description: "Requests and concurrency remaining on this credential, read off the " +
    "`x-sentry-rate-limit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as SentryConnectionDisplay;
    const org = display.organizationSlug;
    if (!org) return { state: "unknown", message: "connection records no organization slug" };

    const res = await ctx.fetch(
      `${resolveBaseUrl(display)}${API_PREFIX}/organizations/${
        encodeURIComponent(org)
      }/?detailed=0`,
      { headers: { accept: "application/json" } },
    );
    // The headers ride on every response including errors, so read them first
    // and only fall back to `unknown` when they are genuinely absent.
    const h = res.headers;
    const limit = num(h.get("x-sentry-rate-limit-limit"));
    const remaining = num(h.get("x-sentry-rate-limit-remaining"));
    if (remaining === undefined) {
      return res.ok
        ? { state: "unknown", message: "response carried no x-sentry-rate-limit-* headers" }
        : { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    const reset = num(h.get("x-sentry-rate-limit-reset"));
    const resetAt = reset === undefined ? undefined : new Date(reset * 1000).toISOString();
    const concurrentLimit = num(h.get("x-sentry-rate-limit-concurrentlimit"));
    const concurrentRemaining = num(h.get("x-sentry-rate-limit-concurrentremaining"));

    const quotas = [{
      id: "requests",
      limit,
      remaining,
      resetAt,
      unit: "requests",
    }];
    if (concurrentRemaining !== undefined) {
      quotas.push({
        id: "concurrent",
        limit: concurrentLimit,
        remaining: concurrentRemaining,
        resetAt: undefined,
        unit: "requests",
      });
    }

    return {
      state: headroom(remaining, limit),
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
