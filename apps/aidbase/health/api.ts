/**
 * Is the Aidbase API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.aidbase.ai`.
 *   - `credential: "none"` — `sign` must not run.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /status` answers
 * `401 {"success":false,"message":"Failed to authorize the user. The API key is missing."}`
 * (measured 2026-10-06). That proves DNS, TLS and the application's auth layer ran. The verdict
 * is taken from the BODY — a JSON object with `success: false` and a string `message` (or a
 * `success: true` status document) — not from the status; an HTML error page or an edge shell
 * is a failure, and a transport failure surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, baseHeaders } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.aidbase.ai/v1/status. A 401 carrying Aidbase's " +
    'JSON `{"success": false, "message": …}` passes — it proves the API and its auth layer ' +
    "are answering. Key validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/status`, { headers: baseHeaders() });
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
    const obj = payload as Record<string, unknown> | null;
    const isObj = !!obj && typeof obj === "object";
    const isAuthError = isObj && obj.success === false && typeof obj.message === "string";
    const isStatus = isObj && obj.success === true;
    if (isAuthError || isStatus) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not an Aidbase response (HTTP ${res.status})`,
    };
  },
};

export default api;
