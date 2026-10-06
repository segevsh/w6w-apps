/**
 * Is the VBOUT API answering?
 *
 * VBOUT publishes no status page (see `service.ts`), so reachability of the API itself is the one
 * out-of-band signal there is.
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.vbout.com`, so the answer is
 *     identical for every Connection.
 *   - `credential: "none"` — `sign` must not run.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /1/app/me.json` answers
 * `401 {"response":{"header":{"status":"error","dataType":"array"},"data":{"errorCode":1000,
 * "errorMessage":"Error occurred while processing your request."}}}` (measured 2026-10-06). That
 * proves DNS, TLS and the application's auth layer ran. The verdict is taken from the BODY — the
 * documented envelope — not the status code; an HTML page is a failure, and a transport failure
 * surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, isEnvelope } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.vbout.com/1/app/me.json. A JSON answer in " +
    "VBOUT's documented response envelope passes (even an auth error) — it proves the API and " +
    "its auth layer are answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/${PROBE_PATH}`, {
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
    if (isEnvelope(payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not VBOUT's response envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
