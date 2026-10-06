/**
 * Is the FareHarbor External API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `fareharbor.com`; the answer is
 *     identical for every Connection.
 *   - `credential: "none"` — `sign` must not run. The documented limits are per IP, so an
 *     unsigned probe still spends from the shared pool, hence the 2-minute floor.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /companies/` answers
 * `400 {"error": …, "status": 400, "code": "key-missing"}` (measured 2026-10-06), proving DNS,
 * TLS and the application's auth layer ran. The verdict is taken from the BODY — a JSON object
 * carrying a string `code` and `error` — not from the status. An HTML page is a failure. (The
 * documented `GET /ping/` answers 200 with an empty body and `content-type: text/html`, which
 * cannot be told from an edge shell, so it is not the probe.)
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_ROOT, errorCode, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "External API reachable",
  description: "Unauthenticated GET https://fareharbor.com/api/external/v1/companies/. A " +
    "400 key-missing carrying FareHarbor's JSON error envelope passes — it proves the API and " +
    "its auth layer are answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_ROOT}/companies/`, {
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
    if (errorCode(payload) !== undefined && errorText(payload) !== undefined) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a FareHarbor error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
