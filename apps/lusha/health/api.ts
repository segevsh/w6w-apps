/**
 * Is Lusha's API answering? An unsigned reachability probe.
 *
 * Measured 2026-10-06: `GET https://api.lusha.com/v3/account/usage` with no `api_key` header is
 * HTTP 401 `{"statusCode":401,"error":"invalid_request","error_description":"missing
 * Authorization header"}` (JSON). A schema-correct JSON 401 proves DNS, TLS and the application
 * are working, so that is a PASS; whether the key is good is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /v3/account/usage. Lusha's documented JSON 401 is the expected healthy response; key validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/v3/account/usage`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach ${API_BASE}: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { statusCode?: unknown } | null = null;
    try {
      body = raw ? JSON.parse(raw) as { statusCode?: unknown } : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401 && body?.statusCode === 401) {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET /v3/account/usage returned ${res.status}; expected 401`,
      };
    }
    return { state: "degraded", message: `API returned an unexpected ${res.status}` };
  },
};

export default api;
