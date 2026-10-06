/**
 * Is the Printful API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /stores`. **A schema-correct
 * auth error is a PASS.** Measured 2026-10-06: with no credential the API answers HTTP 401
 * `{"code":401,"result":"This endpoint requires Oauth authentication!","error":{"reason":
 * "Unauthorized","message":"…"}}`, which proves the application (not just Cloudflare) is
 * routing. The verdict is read from the body (`error.reason` is a non-empty string), not the
 * status. The catalog reads (`/products`) are deliberately not used: they answer 200 to anyone
 * and can be served from cache. A 5xx is `down`; credential validity is the derived `auth:*`
 * check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /stores. Printful's JSON `error` envelope (401 Unauthorized) " +
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
      res = await ctx.fetch(`${API_BASE}/stores`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach api.printful.com: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from api.printful.com`,
        ttlSeconds: 120,
      };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const err = vendorError(body);
    if (typeof err?.reason === "string" && err.reason !== "") {
      return {
        state: "ok",
        message: `api.printful.com is serving (HTTP ${res.status}, ${err.reason})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "degraded",
      message:
        `api.printful.com answered HTTP ${res.status} with a body that is not Printful's error envelope`,
    };
  },
};

export default api;
