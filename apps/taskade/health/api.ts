/**
 * Is the Taskade API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /workspaces`. **A schema-correct
 * auth error is a PASS.** Measured 2026-10-06: with no credential the API answers HTTP 401
 * `{"ok":false,"message":"Unauthorized","code":"UNAUTHORIZED","statusMessage":"Unauthorized"}`,
 * which proves the application (not just the Cloudflare edge) is routing. The verdict is read
 * from the body (`ok: false` plus a string `code`), not the status. A 5xx is `down`; credential
 * validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /workspaces. Taskade's `ok:false` UNAUTHORIZED envelope " +
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
      res = await ctx.fetch(`${API_BASE}/workspaces`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach www.taskade.com: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from www.taskade.com`, ttlSeconds: 120 };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const err = vendorError(body);
    if (err) {
      return {
        state: "ok",
        message: `www.taskade.com/api/v1 is serving (HTTP ${res.status}, ${err.code})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "degraded",
      message: `www.taskade.com/api/v1 answered HTTP ${res.status} with a body that is not ` +
        "Taskade's error envelope",
    };
  },
};

export default api;
