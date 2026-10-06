/**
 * Is the Hospitable API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `public.api.hospitable.com`.
 *   - `credential: "none"` — `sign` must not run.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v2/user` answers
 * `401 {"message":"Unauthenticated."}` with `content-type: application/json` (measured
 * 2026-10-06). That proves DNS, TLS and the application's auth layer ran. The verdict is taken
 * from the BODY — a JSON object with a string `message` (the auth error) or a `data` document —
 * not from the status; an HTML error page or an edge shell is a failure, and a transport failure
 * surfaces as the hook throwing. Whether a token is valid is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://public.api.hospitable.com/v2/user. A 401 carrying " +
    'Hospitable\'s JSON `{"message": …}` passes — it proves the API and its auth layer are ' +
    "answering. Token validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/user`, {
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
    const obj = payload as Record<string, unknown> | null;
    const isObj = !!obj && typeof obj === "object";
    const isAuthError = isObj && typeof obj.message === "string" && res.status === 401;
    const isDocument = isObj && "data" in obj;
    if (isAuthError || isDocument) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Hospitable response (HTTP ${res.status})`,
    };
  },
};

export default api;
