import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}/webhooks`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${PROBE_URL}. Loop's gateway answers a schema-correct JSON 401 ` +
    "(GEN-UNAUTHORIZED) when the API is serving; an HTML body or a 5xx is not the API.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (text.trimStart().startsWith("<")) {
      return { state: "unknown", message: `HTML body (HTTP ${res.status}), not the API` };
    }
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (errorText(body) !== null && (res.status === 401 || res.status === 403)) {
      return { state: "ok", message: `HTTP ${res.status}: API is serving`, ttlSeconds: 120 };
    }
    return { state: "unknown", message: `unexpected HTTP ${res.status} from the API probe` };
  },
};

export default api;
