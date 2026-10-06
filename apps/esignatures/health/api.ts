import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorParts } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${API_BASE}${API_PREFIX}/templates. A 403 carrying eSignatures' own ` +
    '`{"status":"error","data":{"error_code":"forbidden"}}` body passes: it proves the API and ' +
    "its auth layer are answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/templates`, {
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
    if (errorParts(payload).code !== undefined) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not an eSignatures envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
