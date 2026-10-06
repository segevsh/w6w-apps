/**
 * Is the Ahrefs API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /subscription-info/limits-and-usage`
 * (free, no units). **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no
 * credential the API answers HTTP 403 `["Error","Forbidden"]`, which proves the application (not
 * just the Cloudflare edge) is routing. The verdict is read from the body — a `["Error", "<label>"]`
 * array or an `{ "error": "…" }` object — not the status. A 5xx is `down`; credential validity is
 * the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorLabel } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET limits-and-usage. Ahrefs' JSON error body (Forbidden) passes: " +
    "it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/subscription-info/limits-and-usage`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.ahrefs.com: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from api.ahrefs.com`, ttlSeconds: 120 };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const label = errorLabel(body);
    if (label) {
      return {
        state: "ok",
        message: `api.ahrefs.com is serving (HTTP ${res.status}, ${label})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "degraded",
      message: `api.ahrefs.com answered HTTP ${res.status} with a body that is not Ahrefs' error`,
    };
  },
};

export default api;
