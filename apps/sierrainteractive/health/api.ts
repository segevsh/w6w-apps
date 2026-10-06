/**
 * Is Sierra's API answering?
 *
 * Unsigned `GET /zapier/validateAPIKey`. **A schema-correct auth error is a PASS**: with no key
 * it answers `400 {"success":false,"errorMessage":"Unauthorized request"}` (measured 2026-10-06),
 * which proves DNS, TLS and the application's auth layer ran. The verdict is taken from the
 * BODY (the vendor's own envelope), not the status code; an HTML page or a 5xx is a failure.
 * Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, isEnvelope, parseJson } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /zapier/validateAPIKey. A 400 carrying Sierra's JSON " +
    '`{"success": false, "errorMessage": …}` envelope passes: the API and its auth layer ' +
    "are answering.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    const body = parseJson(text);
    if (body === undefined) {
      return { state: "down", message: `non-JSON body (HTTP ${res.status})`, ttlSeconds: 120 };
    }
    if (isEnvelope(body)) {
      return { state: "ok", message: `HTTP ${res.status}: API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not Sierra's envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
