import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** An unsigned read that needs no parameters. */
export const PROBE_URL = `${API_URL}/users`;

/**
 * Is `public.api.iclosed.io` serving? An unsigned `GET /v1/users` answers
 * `401 {"message":"API key is required"}` — measured 2026-10-06 — which proves
 * DNS, TLS and the auth layer are up. Credential validity is the derived
 * `auth:*` check's job, so a schema-correct 401 is a pass, not an outage.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "iClosed API reachable",
  description: 'Unauthenticated GET /v1/users; a 401 {"message":"API key is required"} passes.',
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text();
    let body: { message?: unknown } | null = null;
    try {
      body = JSON.parse(text) as { message?: unknown };
    } catch {
      return {
        state: "down",
        message: `public.api.iclosed.io returned a non-JSON body (HTTP ${res.status})`,
      };
    }

    if (res.status === 401) {
      return {
        state: body?.message === "API key is required" ? "ok" : "unknown",
        message: body?.message === "API key is required"
          ? undefined
          : "unexpected 401 body from an unsigned read",
        ttlSeconds: 120,
      };
    }
    if (res.status === 404) {
      return { state: "down", message: "GET /v1/users 404s — the API is no longer mounted at /v1" };
    }
    if (res.status === 429) {
      return { state: "degraded", message: "iClosed is rate limiting the health probe" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `public.api.iclosed.io returned HTTP ${res.status}` };
    }
    return {
      state: "unknown",
      message: `unexpected HTTP ${res.status} from an unauthenticated /v1/users`,
    };
  },
};

export default api;
