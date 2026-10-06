/**
 * Is the Everhour API answering?
 *
 * Everhour's status page is HTML-only (see `service.ts`), so reachability of the API itself is
 * the one out-of-band signal there is.
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.everhour.com`, no per-tenant
 *     subdomain, so the answer is identical for every Connection.
 *   - `credential: "none"` — `sign` must not run. The documented limit is per API key, so an
 *     unsigned probe spends nobody's allowance.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /users/me` answers
 * `403 {"code":403,"message":"Access denied"}` (measured 2026-10-06). That proves DNS, TLS and
 * the application's auth layer ran. The verdict is taken from the BODY — a JSON object with a
 * numeric `code` and a string `message` — not from the status code; anything else (an HTML
 * error page, an edge shell) is a real failure, and a transport failure surfaces as the hook
 * throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, isErrorEnvelope } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET https://api.everhour.com/users/me. A 403 carrying Everhour's JSON " +
    '`{"code": …, "message": …}` passes — it proves the API and its auth layer are answering. ' +
    "Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/users/me`, { headers: baseHeaders() });
    const text = await res.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (isErrorEnvelope(payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not an Everhour error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
