/**
 * Is the Recruit CRM API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — `sign` must not run, so the probe spends no
 * token's allowance (the documented limit is 60 requests a minute per token).
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v1/users` answers
 * `401 {"error":"Unauthorized"}` (measured 2026-10-06). That proves DNS, TLS and the
 * application's auth layer ran. The verdict is taken from the BODY — a JSON object carrying
 * an error string — never the status code; HTML or an edge shell is not a pass, and a
 * transport failure surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET https://api.recruitcrm.io/v1/users. A 401 carrying Recruit CRM's JSON " +
    '`{"error": …}` passes — it proves the API and its auth layer are answering. Credential ' +
    "validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/users`, {
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
      message: `JSON body was not a Recruit CRM envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
