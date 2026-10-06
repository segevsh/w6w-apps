/**
 * Is the SignWell API answering?
 *
 * The status page names no API component (see `service.ts`), so reachability of the API itself is
 * the stronger out-of-band signal.
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `www.signwell.com`, no per-tenant
 *     subdomain, so the answer is identical for every Connection.
 *   - `credential: "none"` — `sign` must not run, so the probe spends nobody's allowance.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /api/v1/me` answers
 * `401 {"message":"Missing or invalid authorization key","meta":{"error":"missing_authorization_key_error",…}}`
 * (measured 2026-10-06). That proves DNS, TLS, the CDN and the application's auth layer all ran.
 * The verdict is taken from the BODY — an error envelope carrying a string `meta.error` — not from
 * the status code; an HTML error page or edge shell is a real failure, and a transport failure
 * surfaces as the hook throwing. Credential validity is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorCode, isErrorEnvelope } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET https://www.signwell.com/api/v1/me. A 401 carrying SignWell's " +
    "JSON error envelope (`meta.error`) passes — it proves the API and its auth layer are " +
    "answering.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/me`, { headers: { accept: "application/json" } });
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
    if (errorCode(payload) !== undefined || isErrorEnvelope(payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a SignWell envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
