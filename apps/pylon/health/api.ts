/**
 * Is Pylon's API answering — on THIS connection's region host? An unsigned reachability probe.
 *
 * With no credential the healthy answer is an authentication error. Measured 2026-10-06,
 * `GET https://api.usepylon.com/me` with no header returns HTTP 401
 * `{"errors":["Token must follow Bearer authorization scheme: …"],"request_id":…,
 * "code":"invalid_authorization_header"}`, and `api.eu.usepylon.com` answers the same. A
 * schema-correct error envelope carrying one of the documented authentication codes proves DNS,
 * TLS and the application are working, so that is a PASS; whether the token is good is the
 * derived `auth:api-token` check's job. An unknown path answers `{"code":"not_found"}` rather
 * than a generic page, so an HTML 200 is never mistaken for the API.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URLS, type PylonErrorBody, regionFrom } from "../lib/client.ts";

const AUTH_CODES = new Set([
  "invalid_authorization_header",
  "invalid_api_token",
  "invalid_oauth_token",
  "wrong_region_token",
]);

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /me on the connection's region host. Pylon's documented 401 authentication error is the expected healthy answer; token validity is the `auth:api-token` check's job.",
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
      res = await ctx.fetch(`${base}/me`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach ${base}: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: PylonErrorBody | null = null;
    try {
      body = raw ? JSON.parse(raw) as PylonErrorBody : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (body?.code && AUTH_CODES.has(body.code) && Array.isArray(body.errors)) {
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
        message: `unauthenticated GET /me returned ${res.status}; expected an authentication error`,
      };
    }
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${
        body?.errors?.[0] ?? raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
