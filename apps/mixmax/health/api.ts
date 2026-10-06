/**
 * Is Mixmax's API answering? An unsigned reachability probe.
 *
 * Measured 2026-10-06: `GET https://api.mixmax.com/v1/users/me` with no token answers HTTP 401
 * `application/json` `{"message":"No API token provided; …","link":…,"documentation":…}`, and with a
 * bad token `{"message":"Invalid API token provided",…}`. A schema-correct `{message: string}` 401
 * proves DNS, TLS and the application are working, so it is a PASS; whether the token is good is
 * the derived `auth:api-token` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /users/me. Mixmax's documented 401 `{message}` answer is the expected healthy response; token validity is the `auth:api-token` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/users/me`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach ${API_BASE}: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: { message?: unknown } | null = null;
    try {
      body = raw ? JSON.parse(raw) as { message?: unknown } : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401 && typeof body?.message === "string") {
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
        message:
          `unauthenticated GET /users/me returned ${res.status}; expected an authentication error`,
      };
    }
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${
        typeof body?.message === "string" ? body.message : raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
