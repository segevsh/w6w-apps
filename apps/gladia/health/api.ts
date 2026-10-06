/**
 * Is `api.gladia.io` answering? An unsigned reachability probe.
 *
 * Measured 2026-10-06: `GET /v2/pre-recorded?limit=1` with no key answers HTTP 401 with the
 * documented error envelope `{"statusCode":401,"message":"no gladia key provided",
 * "request_id":"G-…"}`. That schema-correct auth error proves DNS, TLS and the application,
 * so it is a PASS; whether any key is good is the derived `auth:api-key` check's job.
 * The body is checked, not just the status: a 401 from a proxy or an HTML shell is not
 * proof of anything.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description: "Unauthenticated GET of api.gladia.io/v2/pre-recorded. The documented 401 error " +
    "envelope is the healthy answer; credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/v2/pre-recorded?limit=1`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.gladia.io: ${e}` };
    }
    const text = await res.text().catch(() => "");

    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    if (res.status === 401) {
      let body: { statusCode?: unknown; request_id?: unknown } | null = null;
      try {
        body = JSON.parse(text);
      } catch { /* not JSON */ }
      if (body?.statusCode === 401 && typeof body.request_id === "string") {
        return {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        };
      }
      return { state: "degraded", message: "401 without Gladia's error envelope" };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET returned ${res.status}; expected 401`,
      };
    }
    return { state: "degraded", message: `API returned an unexpected ${res.status}` };
  },
};

export default api;
