/**
 * Is the Graph API answering?
 *
 * Meta publishes no machine-readable status (see `service.ts`), so reachability of the API
 * itself is the one out-of-band signal there is.
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, so the answer is the same for
 *     every Connection.
 *   - `credential: "none"` — `sign` must not run, so no Page token is spent or exposed.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v26.0/me?fields=id` answers
 * HTTP 400 `{"error":{"type":"OAuthException","code":2500,
 * "message":"An active access token must be used to query information about the current
 * user."}}` (measured 2026-10-06). That proves DNS, TLS and Graph's application layer all
 * ran. The verdict is taken from the BODY — a Graph error envelope with a numeric `code` and
 * a string `type` — never from the status code, and a request that does not receive that
 * envelope (an HTML shell, an edge error page) is not a pass.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, graphError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Graph API reachable",
  description:
    "Unauthenticated GET /me?fields=id on graph.facebook.com. Graph's own OAuth error envelope " +
    "passes — it proves the API is answering. Token validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the Graph API`, ttlSeconds: 120 };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }
    const err = graphError(payload);
    if (err && typeof err.code === "number" && typeof err.type === "string") {
      return {
        state: "ok",
        message: `Graph answered code ${err.code} — API is serving`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message: `body was not a Graph error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
