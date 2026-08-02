/**
 * How much headroom is left on THIS credential — SurveyMonkey.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance is per-app-per-day (metered against
 *     the OAuth application, not the individual user), but reading it still
 *     needs a live credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /users/me`, the same cheap, scope-free call the `oauth2` auth
 * method's `test` hook already makes — no dedicated quota endpoint exists, so
 * this reads the rate-limit headers SurveyMonkey stamps on every response
 * instead of spending a second, more expensive call.
 *
 * SurveyMonkey meters two windows at once (verified against the vendor's
 * public API docs): a per-minute burst and a per-day allowance, each with its
 * own `X-Ratelimit-App-Global-*` header trio. Both are **app-global** — shared
 * across every user of this OAuth application, not scoped to one Connection.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** SurveyMonkey's `*-Reset` headers are documented as SECONDS FROM NOW, not an epoch instant. */
const isoFromDelta = (seconds: number | undefined): string | undefined =>
  seconds === undefined ? undefined : new Date(Date.now() + seconds * 1000).toISOString();

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
    "Per-minute and per-day allowances remaining, read off the `X-Ratelimit-App-Global-*` headers on a GET /users/me call.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const minuteLimit = num(h.get("x-ratelimit-app-global-minute-limit"));
    const minuteRemaining = num(h.get("x-ratelimit-app-global-minute-remaining"));
    const minuteResetSeconds = num(h.get("x-ratelimit-app-global-minute-reset"));
    const dayLimit = num(h.get("x-ratelimit-app-global-day-limit"));
    const dayRemaining = num(h.get("x-ratelimit-app-global-day-remaining"));
    const dayResetSeconds = num(h.get("x-ratelimit-app-global-day-reset"));

    if (minuteRemaining === undefined && dayRemaining === undefined) {
      return {
        state: "unknown",
        message: "response carried no X-Ratelimit-App-Global-* headers",
      };
    }

    return {
      // Worst window wins. A minute dip recovers in seconds; a spent daily
      // allowance locks the app out until midnight GMT, so it deserves the flag.
      state: worstHealthState([
        headroom(minuteRemaining, minuteLimit),
        headroom(dayRemaining, dayLimit),
      ]),
      quota: [
        {
          id: "minute",
          limit: minuteLimit,
          remaining: minuteRemaining,
          resetAt: isoFromDelta(minuteResetSeconds),
          unit: "requests",
        },
        {
          id: "day",
          limit: dayLimit,
          remaining: dayRemaining,
          resetAt: isoFromDelta(dayResetSeconds),
          unit: "requests",
        },
      ],
      ttlSeconds: 60,
    };
  },
};

export default quota;
