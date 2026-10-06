/**
 * Is the PrintNode API answering?
 *
 * `GET /ping` is the vendor's documented reachability endpoint: "No authentication is
 * required", answers `200` with the JSON string `"OK"` (re-measured 2026-10-06).
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, identical for every Connection.
 *   - `credential: "none"` — `sign` must not run.
 *
 * The verdict is taken from the BODY, not the status code: the JSON string `"OK"` passes. A
 * schema-correct PrintNode error object (`{code, message}`, e.g. from an edge that began
 * demanding auth) below 500 has also proved the application layer is answering, so it passes
 * too. 5xx is down; an HTML shell or any other JSON is not evidence of PrintNode and is
 * reported `down` / `unknown` respectively.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, isErrorBody } from "../lib/client.ts";

export const PING_PATH = "/ping";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: 'Unauthenticated GET https://api.printnode.com/ping. The JSON string "OK" ' +
    "passes. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PING_PATH}`, {
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
    if (payload === "OK") return { state: "ok", message: "API is serving", ttlSeconds: 120 };
    if (isErrorBody(payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was neither "OK" nor a PrintNode error object (HTTP ${res.status})`,
    };
  },
};

export default api;
