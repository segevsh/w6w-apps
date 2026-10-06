import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, isPerspectiveError } from "../lib/client.ts";

/**
 * Unsigned reachability of the External API.
 *
 * An unsigned `GET /v1/workspaces` answers 401 `{"error":"API key is
 * required","status":401}` (observed 2026-10-06). That schema-correct auth
 * error proves the API and its auth layer are serving, so it is a PASS.
 * Credential validity is the derived `auth:api-key` check's job.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1/workspaces. A 401 carrying Perspective's " +
    '`{"error", "status"}` body passes.',
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/workspaces`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `non-JSON body (HTTP ${res.status})`, ttlSeconds: 120 };
    }
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (res.status === 429) {
      return { state: "degraded", message: "rate limited (HTTP 429)", ttlSeconds: 60 };
    }
    if (isPerspectiveError(payload)) {
      return { state: "ok", message: `HTTP ${res.status} - API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `body was not a Perspective envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
