/**
 * Is the Productive API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"`: one shared host, `api.productive.io`, no per-tenant
 *     subdomain, so the answer is identical for every Connection.
 *   - `credential: "none"`: `sign` must not run. The documented limits are per token and per
 *     organization, so an unsigned probe spends nobody's allowance.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /projects` answers
 * `401 application/vnd.api+json {"errors":[{"status":"401","code":"invalid_auth_token",
 * "title":"Unauthenticated", ...}]}` (measured 2026-10-06). That proves DNS, TLS and the
 * application's auth layer ran. The verdict is taken from the BODY (an `errors` array whose
 * first entry has a string `title` or `code`), not from the status; an HTML error page or an
 * edge shell is a real failure, and a transport failure surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, isErrorEnvelope } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET https://api.productive.io/api/v2/projects. A 401 carrying Productive's " +
    "JSON:API `errors` envelope passes: it proves the API and its auth layer are answering. " +
    "Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/projects?page[size]=1`, { headers: baseHeaders() });
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
    if (isErrorEnvelope(payload)) {
      return { state: "ok", message: `HTTP ${res.status}: API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Productive error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
