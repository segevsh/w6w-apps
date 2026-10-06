/**
 * Is the MoonClerk API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /forms?count=1`. **A
 * schema-correct auth error is a PASS.** Measured 2026-10-06: with no credential the API answers
 * HTTP 401 `text/plain` `HTTP Token: Access denied.` (Rails token auth), which proves the
 * application, not just the Cloudflare edge, is routing. The verdict is read from that body, not
 * the status. A 5xx is `down`; credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { ACCEPT, API_BASE, isAccessDenied } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /forms. MoonClerk's `Access denied` 401 passes: it proves " +
    "the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/forms?count=1`, { headers: { accept: ACCEPT } });
    } catch (e) {
      return { state: "down", message: `could not reach api.moonclerk.com: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from api.moonclerk.com`,
        ttlSeconds: 120,
      };
    }
    if (isAccessDenied(text)) {
      return {
        state: "ok",
        message: `api.moonclerk.com is serving (HTTP ${res.status}, access denied without a key)`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "degraded",
      message: `api.moonclerk.com answered HTTP ${res.status} with a body that is not ` +
        "MoonClerk's token-auth error",
    };
  },
};

export default api;
