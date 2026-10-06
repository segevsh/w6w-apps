/**
 * Is the Placid API answering?
 *
 * An unsigned `GET /templates` answers `401 {"message":"Unauthenticated."}` (measured live
 * 2026-10-06). That proves DNS, TLS and the application's auth layer all ran, so a schema-correct
 * JSON `message` is a PASS. The verdict is taken from the BODY; an HTML page or edge shell is a
 * real failure and a 5xx is an outage. `credential: "none"` keeps `sign` from running, so the
 * probe spends none of the project's 60 requests/minute.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /api/rest/templates. A 401 carrying Placid's JSON " +
    '`{"message": …}` passes: the API and its auth layer are answering. Credential validity ' +
    "is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/templates`, {
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
    if (errorText(payload) !== undefined) {
      return { state: "ok", message: `HTTP ${res.status}: API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Placid envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
