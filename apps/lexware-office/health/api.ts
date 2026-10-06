/**
 * Is the Lexware API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `api.lexware.io`, no per-tenant
 *     subdomain, so the answer is identical for every Connection.
 *   - `credential: "none"` — `sign` must not run; an unsigned probe spends nobody's 2 req/s.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v1/profile` answers
 * `401 {"message":"Unauthorized"}` from the AWS API gateway (measured 2026-10-06). That
 * proves DNS, TLS and the gateway ran. Note the gateway answers the identical body for a
 * wrong key, so this proves reachability of the gateway, not the application behind it; a
 * downstream outage shows up as 5xx/504 on real traffic and as the derived `auth:*` check.
 * The verdict is taken from the BODY — a JSON object with a string `message` — not the
 * status code; an HTML shell is a failure, and a transport failure surfaces as a throw.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET https://api.lexware.io/v1/profile. A 401 carrying the " +
    'gateway\'s JSON `{"message": "Unauthorized"}` passes — it proves the API gateway is ' +
    "answering. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/profile`, {
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
    const hasMessage = !!payload && typeof payload === "object" &&
      typeof (payload as { message?: unknown }).message === "string";
    const hasProfile = !!payload && typeof payload === "object" &&
      typeof (payload as { organizationId?: unknown }).organizationId === "string";
    if (hasMessage || hasProfile) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Lexware envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
