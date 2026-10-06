/**
 * Is the Elastic Email API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"`, `credential: "none"` — one shared host,
 *     `api.elasticemail.com`; `sign` must not run, so nobody's key is spent.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v4/statistics?from=…`
 * answers HTTP 400 `{"Error":"APIKey Expired"}` (measured 2026-10-06). That proves DNS,
 * TLS and the application's auth layer ran. The verdict is taken from the BODY — a JSON
 * object with a string `Error` — not from the status code; an HTML error page or edge shell
 * is a real failure, and a transport failure surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { errorText } from "../lib/client.ts";
import { probeUrl } from "../auth/api-key.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.elasticemail.com/v4/statistics. HTTP 400 with " +
    'Elastic Email\'s JSON `{"Error": …}` passes — it proves the API and its auth layer are ' +
    "answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(probeUrl(), { headers: { accept: "application/json" } });
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
      message: `JSON body was not an Elastic Email error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
