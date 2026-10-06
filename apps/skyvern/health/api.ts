/**
 * Is the Skyvern API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.skyvern.com`.
 *   - `credential: "none"` — `sign` must not run.
 *
 * Unsigned `GET /v1/version` answers 200 `{"version": "<git sha>"}` to anyone (measured
 * 2026-10-06). A schema-correct auth error — HTTP 403 `{"detail": "<string>"}` — also proves the
 * API and its auth layer ran, so it passes too. The verdict comes from the BODY: an HTML error
 * page or edge shell is a failure, a 5xx is down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.skyvern.com/v1/version. A 200 carrying " +
    '`{"version": …}` (or a 403 carrying Skyvern\'s `{"detail": …}`) proves the API is serving. ' +
    "Key validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/v1/version`, {
      headers: { accept: "application/json" },
    });
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
    const obj = payload as Record<string, unknown> | null;
    const isVersion = !!obj && typeof obj === "object" && typeof obj.version === "string";
    const isAuthError = !!obj && typeof obj === "object" && typeof obj.detail === "string";
    if (isVersion || isAuthError) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Skyvern response (HTTP ${res.status})`,
    };
  },
};

export default api;
