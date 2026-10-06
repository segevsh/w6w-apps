/**
 * Is the Encharge API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.encharge.io`.
 *   - `credential: "none"` — `sign` must not run.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v1/accounts/info` answers
 * `401 {"error":{"message":"User not logged in: Unauthorized request: no authentication given",
 * "markdown":…}}` (measured 2026-10-06). That proves DNS, TLS and the application's auth layer
 * ran. The verdict is taken from the BODY — a JSON object whose `error` member is an object with
 * a string `message` — not from the status; an HTML page (an unknown path answers
 * `Cannot GET …` as HTML) or an edge shell is a failure, and a transport failure surfaces as the
 * hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.encharge.io/v1/accounts/info. A 401 carrying " +
    'Encharge\'s JSON `{"error": {"message": …}}` passes — it proves the API and its auth ' +
    "layer are answering. Key validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/accounts/info`, {
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
    const err = (payload as { error?: unknown } | null)?.error;
    const isAuthError = !!err && typeof err === "object" &&
      typeof (err as { message?: unknown }).message === "string";
    const isInfo = !!payload && typeof payload === "object" && "accountId" in payload;
    if (isAuthError || isInfo) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not an Encharge response (HTTP ${res.status})`,
    };
  },
};

export default api;
