/**
 * Is `api.fireberry.com` answering? An unsigned reachability probe.
 *
 * Measured 2026-10-06: `POST https://api.fireberry.com/api/v3/query` with no
 * token answers HTTP 401 `{"error":"Unauthorized","status":401,"message":"Invalid token undefined"}`.
 * That schema-correct JSON error proves DNS, TLS and the application are up, so
 * it is a PASS; whether a token is good is the derived `auth:token` check's job.
 * The legacy `/api/record/*` and `/metadata/*` routes also answer 401 but with a
 * BODILESS response, which could come from any intermediary, so they are not used
 * as the probe. The empty `{}` body is rejected at the auth guard, before any parsing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type FireberryErrorBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated POST of api.fireberry.com/api/v3/query. Fireberry's JSON 401 is the expected healthy answer; token validity is the `auth:token` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/api/v3/query`, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: "{}",
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.fireberry.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: FireberryErrorBody | null = null;
    try {
      body = raw ? JSON.parse(raw) as FireberryErrorBody : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401) {
      return body?.error === "Unauthorized" && typeof body?.message === "string"
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without Fireberry's JSON error body — an intermediary may be answering",
        };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated POST /api/v3/query returned ${res.status}; expected 401`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${body?.message ?? raw.slice(0, 120)}`,
    };
  },
};

export default api;
