import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorText, V1 } from "../lib/client.ts";

/**
 * Unauthenticated `GET /api/v1/company`. Alegra's gateway answers an unsigned request with
 * `401 {"message":"Unauthorized"}` — a schema-correct auth refusal that proves the API edge is
 * reachable, so it is a PASS. Credential validity is the derived `auth:basic` check's job.
 *
 * Note the gateway answers the same body for any path, so this proves the edge, not a route.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.alegra.com/api/v1/company. A 401 carrying " +
    'Alegra\'s JSON `{"message":"Unauthorized"}` passes: the API edge is answering.',
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${V1}/company`, {
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
    if (errorText(payload) !== undefined) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not an Alegra envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
