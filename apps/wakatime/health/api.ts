/**
 * Is the WakaTime API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /users/current`. **A
 * schema-correct auth error is a PASS.** Measured 2026-10-06: with no credential the API answers
 * HTTP 401 `{"errors": ["Unauthorized."]}` as `application/json`, which proves the application
 * (not just an edge proxy or a SPA shell) is routing. The verdict is read from the body (a JSON
 * `errors` array), not the status. A 5xx is `down`; credential validity is the derived `auth:*`
 * check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_HOST, isErrorEnvelope } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /users/current. WakaTime's JSON `errors` envelope " +
    "(Unauthorized) passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/users/current`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach ${API_HOST}: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from ${API_HOST}`, ttlSeconds: 120 };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (isErrorEnvelope(body)) {
      return {
        state: "ok",
        message: `${API_HOST} is serving (HTTP ${res.status}, errors envelope)`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "degraded",
      message: `${API_HOST} answered HTTP ${res.status} with a body that is not WakaTime's ` +
        "error envelope",
    };
  },
};

export default api;
