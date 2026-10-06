/**
 * Is Recall's API answering — on THIS connection's region host? An unsigned reachability probe.
 *
 * With no credential the healthy answer is an authentication error. Measured 2026-10-06,
 * `GET https://us-east-1.recall.ai/api/v1/bot/` with no header returns HTTP 401
 * `{"code":"not_authenticated","detail":"Authentication credentials were not provided."}`, and a
 * bogus token returns `{"code":"authentication_failed", ...}`. A schema-correct `{code, detail}`
 * body carrying one of those codes proves DNS, TLS and the application are working, so that is a
 * PASS; whether the key is good is the derived `auth:api-key` check's job. An HTML 200 is never
 * mistaken for the API.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URLS, regionFrom } from "../lib/client.ts";

const AUTH_CODES = new Set(["not_authenticated", "authentication_failed"]);

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /api/v1/bot/ on the connection's region host. Recall's documented 401 `not_authenticated` error is the expected healthy answer; key validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const base = API_URLS[regionFrom(ctx.connection)];
    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/v1/bot/`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach ${base}: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { code?: string; detail?: string } | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (body?.code && AUTH_CODES.has(body.code) && typeof body.detail === "string") {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    if (res.status >= 500 && res.status !== 507) {
      return { state: "down", message: `API returned ${res.status}` };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message:
          `unauthenticated GET /api/v1/bot/ returned ${res.status}; expected an authentication error`,
      };
    }
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${body?.detail ?? raw.slice(0, 120)}`,
    };
  },
};

export default api;
