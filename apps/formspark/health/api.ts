/**
 * Is the Formspark API answering?
 *
 * Formspark has no machine-readable status (see `service.ts`), so reachability of the API
 * itself is the one out-of-band signal there is.
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.formspark.io`, so the
 *     answer is identical for every Connection.
 *   - `credential: "none"` — `sign` must not run; an unsigned probe spends nobody's allowance
 *     and cannot reveal a token.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /me` answers
 * `401 application/problem+json {"code":"invalid_token", …}` (measured 2026-10-06). That
 * proves DNS, TLS and the application's auth layer all ran. The verdict is taken from the BODY
 * — a problem object with a string `code` — not from the status code; anything that is not
 * that (an HTML error page, an edge shell) is a real failure, and a transport failure
 * surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, problemCode } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.formspark.io/public/v1/me. A 401 carrying " +
    "Formspark's problem+json `code` passes — it proves the API and its auth layer are " +
    "answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/me`, { headers: { accept: "application/json" } });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }
    if (problemCode(payload) !== undefined) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Formspark problem document (HTTP ${res.status})`,
    };
  },
};

export default api;
