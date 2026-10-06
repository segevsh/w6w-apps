/**
 * Is the Twist API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.twist.com`.
 *   - `credential: "none"` — `sign` does not run, so the probe spends nobody's token.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /api/v3/workspaces/get` answers
 * `403 {"error_code":200,"error_string":"Invalid token",…}` (measured 2026-10-06; a missing and
 * an invalid token are the same answer). That proves DNS, TLS, the CDN and Twist's own auth
 * layer all ran. The verdict is taken from the BODY — a numeric `error_code` plus an
 * `error_string` — not the status code. An HTML shell or any other body is not a pass.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, asTwistError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET https://api.twist.com/api/v3/workspaces/get. Twist's JSON auth error " +
    "(`error_code` + `error_string`) passes — it proves the API is serving. Credential validity " +
    "is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/api/v3/workspaces/get`, {
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
    if (asTwistError(payload) !== undefined || Array.isArray(payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Twist envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
