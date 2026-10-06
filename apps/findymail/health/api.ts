/**
 * Is `app.findymail.com` answering? An unsigned reachability probe.
 *
 * With no credential the healthy answer is an authentication error. Measured 2026-10-06,
 * `GET https://app.findymail.com/api/credits` with `Accept: application/json` and no
 * Authorization returns HTTP 401 `{"message":"Unauthenticated."}`. That schema-correct error
 * proves DNS, TLS and the application are working, so it is a PASS; whether any key is good is
 * the derived `auth:api-key` check's job. (Without the Accept header the same request answered a
 * 403, so the header is part of the probe.)
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type FindymailErrorBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of app.findymail.com/api/credits. The documented 401 `Unauthenticated.` envelope is the expected healthy answer; credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/api/credits`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach app.findymail.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: FindymailErrorBody | null = null;
    try {
      body = raw ? JSON.parse(raw) as FindymailErrorBody : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401) {
      return typeof body?.message === "string"
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without Findymail's JSON error envelope — an intermediary may be answering",
        };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET /api/credits returned ${res.status}; expected 401`,
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
