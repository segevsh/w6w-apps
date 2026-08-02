/**
 * How much headroom is left on THIS credential — HighLevel.
 *
 * `kind: "quota"` — a different question from liveness (`auth:oauth2`, derived
 * from the `oauth2` auth method's `test` hook). `scope: "connection"` and
 * `credential: "signed"` are this kind's defaults and both are correct: the
 * allowance belongs to the credential, and reading it needs the credential on
 * the wire. `severity: "informational"` — running low is worth showing, never
 * worth failing a verdict over.
 *
 * Probe: `GET /locations/{locationId}` — the same cheap, no-object-scope call
 * `auth/oauth2.ts`'s `test` hook uses, so this never reports a narrowly-scoped
 * app as broken over a resource it was never granted.
 *
 * Per HighLevel's docs, rate limits are per app (client) per resource
 * (Location or Company): a **burst** window (`X-RateLimit-Interval-Milliseconds`
 * / `X-RateLimit-Max` / `X-RateLimit-Remaining`) and a **daily** allowance
 * (`X-RateLimit-Limit-Daily` / `X-RateLimit-Daily-Remaining`).
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL, API_VERSION, locationIdFromConnection } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

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
    "Daily and burst allowances remaining, read off the `X-RateLimit-*` response headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const locationId = locationIdFromConnection(ctx.connection);
    const res = await ctx.fetch(`${API_URL}/locations/${locationId}`, {
      headers: { version: API_VERSION },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const dailyLimit = num(h.get("x-ratelimit-limit-daily"));
    const dailyRemaining = num(h.get("x-ratelimit-daily-remaining"));
    const burstLimit = num(h.get("x-ratelimit-max"));
    const burstRemaining = num(h.get("x-ratelimit-remaining"));

    if (dailyRemaining === undefined && burstRemaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    return {
      // Worst window wins. A burst dip recovers in seconds; a spent daily
      // allowance locks the app out until the next day.
      state: worstHealthState([
        headroom(dailyRemaining, dailyLimit),
        headroom(burstRemaining, burstLimit),
      ]),
      quota: [
        { id: "daily", limit: dailyLimit, remaining: dailyRemaining, unit: "requests" },
        { id: "burst", limit: burstLimit, remaining: burstRemaining, unit: "requests" },
      ],
      ttlSeconds: 60,
    };
  },
};

export default quota;
