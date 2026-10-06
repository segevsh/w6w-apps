import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Unsigned `GET /quotas`. An API that is up answers a missing credential with
 * its own error envelope (`401`, `{"error":{"code":401,"message":"Missing
 * \"Authorization\" header",…}}` — measured 2026-10-06), so a schema-correct
 * refusal is a **pass**: it proves the gateway is reachable and speaking
 * Sellsy. Whether the credential is any good is the derived `auth:*` check's job.
 *
 * `status.sellsy.com` is a custom page: no Statuspage `/api/v2` (404), no
 * `index.json`, no Atom/RSS feed (every candidate path 404s), and the old
 * `sellsy.statuspage.io` is inactive. There is nothing to declare, so the
 * reachability probe is the whole service check.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Sellsy API reachability",
  description:
    "Unsigned GET /v2/quotas. A schema-correct 401 proves the API is up; Sellsy's status page publishes no machine-readable feed.",
  kind: "service",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/quotas`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach api.sellsy.com: ${String(err)}` };
    }
    const body = await res.json().catch(() => null) as { error?: { code?: unknown } } | null;
    const refusal = typeof body?.error === "object" && body.error !== null &&
      typeof body.error.code === "number";

    if (res.status >= 500) {
      return { state: "down", message: `Sellsy API answered ${res.status}`, ttlSeconds: 60 };
    }
    if ((res.status === 401 || res.status === 403) && refusal) {
      return { state: "ok", ttlSeconds: 60 };
    }
    if (res.status === 200) {
      return { state: "unknown", message: "unsigned probe unexpectedly returned 200" };
    }
    return {
      state: "unknown",
      message: `unsigned probe returned ${res.status} without a Sellsy error envelope`,
    };
  },
};

export default service;
