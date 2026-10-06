/**
 * Is the Breezy HR API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /user`. **A schema-correct auth
 * error is a PASS.** Measured 2026-10-06: with no credential the API answers HTTP 400
 * `{"error":{"type":"missingAccessToken","message":"access token is null or empty"}}`, which
 * proves the application (not just an edge proxy) is routing. The verdict is read from the body
 * (`error.type` is a non-empty string), not the status. `/health` is deliberately NOT used: its
 * handler "always returns 200 without performing any checks" and would pass behind a broken app.
 * A 5xx is `down`; credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /user. Breezy's JSON `error` envelope (missingAccessToken) " +
    "passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/user`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach api.breezy.hr: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from api.breezy.hr`, ttlSeconds: 120 };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const err = vendorError(body);
    if (typeof err?.type === "string" && err.type !== "") {
      return {
        state: "ok",
        message: `api.breezy.hr is serving (HTTP ${res.status}, ${err.type})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "degraded",
      message:
        `api.breezy.hr answered HTTP ${res.status} with a body that is not Breezy's error envelope`,
    };
  },
};

export default api;
