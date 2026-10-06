/**
 * Is the Avoma API answering?
 *
 * Avoma has no status page (`status.avoma.com` does not resolve, measured 2026-10-06), so
 * reachability of the API itself is the one out-of-band signal there is.
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.avoma.com`, no per-tenant
 *     subdomain, so the answer is identical for every Connection.
 *   - `credential: "none"` — `sign` must not run. The documented limit is 60 requests a
 *     minute per key; an unsigned probe spends nobody's allowance.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v1/users/` answers
 * `401 {"detail":"Auth missing in header and cookie"}` (measured 2026-10-06). That proves DNS,
 * TLS and the application's auth layer all ran. The verdict is taken from the BODY — a JSON
 * object with a string `detail` — not from the status code; anything that is not that
 * (an HTML error page, an edge shell) is a real failure, and a transport failure surfaces as
 * the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.avoma.com/v1/users/. A 401 carrying Avoma's JSON " +
    '`{"detail": …}` passes — it proves the API and its auth layer are answering. Credential ' +
    "validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/v1/users/`, {
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
    if (errorText(payload) !== undefined || Array.isArray(payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not an Avoma envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
