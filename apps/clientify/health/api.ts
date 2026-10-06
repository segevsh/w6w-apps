/**
 * Is the Clientify API host answering?
 *
 * `kind: "dependency"`, `scope: "app"`, `credential: "none"` — one shared host
 * (`api.clientify.net`), and an unsigned probe spends nobody's credential.
 *
 * **A schema-correct auth error is a PASS.** Unsigned `GET /v1/users/` answers
 * `404 {"detail":"Api key not provided."}` (measured 2026-10-06 — a 404, not a 401). That
 * proves DNS, TLS and Clientify's auth layer ran, so the verdict is read from the BODY: a JSON
 * object with a string `detail`, or a list envelope. An HTML body (Clientify serves an HTML
 * 404 for an unknown path, and a CDN would serve its own shell) is a real failure, and a
 * transport failure surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.clientify.net/v1/users/. Clientify's JSON " +
    '`{"detail": …}` auth refusal passes — it proves the API and its auth layer are answering. ' +
    "Credential validity is the derived `auth:*` check's job.",
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
      message: `JSON body was not a Clientify envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
