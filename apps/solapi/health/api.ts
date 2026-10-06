/**
 * Is the SOLAPI API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.solapi.com`.
 *   - `credential: "none"` — `sign` must not run.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /cash/v1/balance` answers
 * `401 {"errorCode":"Unauthorized","errorMessage":"권한이 없습니다."}` (measured 2026-10-06).
 * That proves DNS, TLS and the application's auth layer ran. The verdict is taken from the
 * BODY — a JSON object with a string `errorCode` — not from the status; an HTML page or an edge
 * shell is a failure, and a transport failure surfaces as the hook throwing. Unauthenticated
 * callers get only 5 requests per 5 seconds, far above one probe every two minutes.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, obj } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.solapi.com/cash/v1/balance. A 401 carrying " +
    "SOLAPI's JSON `{errorCode, errorMessage}` passes — it proves the API and its auth layer " +
    "are answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, { headers: baseHeaders() });
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
    if (res.status === 429) {
      return { state: "unknown", message: "rate limited (HTTP 429) — the probe was not judged" };
    }
    if (typeof obj(payload).errorCode === "string") {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a SOLAPI response (HTTP ${res.status})`,
    };
  },
};

export default api;
