import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorMessage } from "../lib/client.ts";

export const API_URL = `${API_BASE}${API_PREFIX}/mailing-lists/?items_per_page=1`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${API_URL}. A 401 carrying thanks.io's own ` +
    '`{"message":"Unauthenticated."}` body passes: it proves the API and its auth layer are ' +
    "answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(API_URL, { headers: { accept: "application/json" } });
    const text = await res.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return {
        state: res.status >= 500 ? "down" : "unknown",
        message: `endpoint returned a non-JSON body (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    const message = errorMessage(payload);
    if (res.status === 401 && message !== undefined && /unauthenticated/i.test(message)) {
      return { state: "ok", message: "HTTP 401 — API is serving", ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `unexpected response (HTTP ${res.status}${message ? `: ${message}` : ""})`,
    };
  },
};

export default api;
