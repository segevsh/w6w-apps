/**
 * Is the Slite API answering?
 *
 * Slite's status page has no machine-readable feed (see `service.ts`), so reachability of the
 * API itself is the one out-of-band signal there is.
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.slite.com`, no per-tenant
 *     subdomain, so the answer is identical for every Connection.
 *   - `credential: "none"` — `sign` must not run, so the probe spends nobody's allowance.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v1/me` answers
 * `401 {"id":"auth/unauthorized","message":"Invalid apiKey"}` (measured 2026-10-06). That
 * proves DNS, TLS and the application's auth layer all ran. The verdict is taken from the BODY —
 * a JSON object with a string `id` and `message` — not from the status code; anything that is
 * not that (an HTML error page, an edge shell) is a real failure, and a transport failure
 * surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorId, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.slite.com/v1/me. A 401 carrying Slite's JSON " +
    '`{"id": …, "message": …}` passes — it proves the API and its auth layer are answering. ' +
    "Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/me`, {
      headers: { accept: "application/json" },
    });
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
    if (errorId(payload) !== undefined && errorText(payload) !== undefined) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    if (res.ok && payload && typeof payload === "object" && "email" in payload) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Slite envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
