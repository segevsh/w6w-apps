import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorOf, PROBE_PATH } from "../lib/client.ts";

/**
 * Is the API answering? An UNSIGNED `GET /v3/debug/ttl`.
 *
 * Measured 2026-10-06: without a token it answers `401
 * {"error":{"code":401,"message":"Unauthorized"}}`. That schema-correct auth error proves the API
 * and its auth layer are serving, so it is a pass — whether a credential is valid is the derived
 * `auth:*` check's job.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v3/debug/ttl. CleverReach's JSON 401 passes: it proves the " +
    "API is answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (errorOf(payload) !== undefined) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    if (res.ok) return { state: "ok", message: "API is serving", ttlSeconds: 120 };
    return {
      state: "unknown",
      message: `body was not a CleverReach envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
