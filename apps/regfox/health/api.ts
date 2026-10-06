import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, type Envelope } from "../lib/client.ts";

export const API_URL = `${API_BASE}${API_PREFIX}/ping`;

/**
 * Unsigned `GET /ping`. The vendor's healthcheck is public (it answers 200 with no key, and
 * with a wrong one), so it proves the API is up and says nothing about the credential; that is
 * the derived `auth:*` check's job. Pass requires the documented envelope, not just a 200.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${API_URL}. Passes on the documented \`{responseCode:200,data}\` ` +
    "envelope. The endpoint is public, so this does not test the API key.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(API_URL, { headers: { accept: "application/json" } });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    let body: Envelope | null = null;
    try {
      body = JSON.parse(text) as Envelope;
    } catch {
      body = null;
    }
    if (res.ok && body?.responseCode === 200 && typeof body.data === "string") {
      return { state: "ok", ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `unexpected response from /ping (HTTP ${res.status})`,
    };
  },
};

export default api;
