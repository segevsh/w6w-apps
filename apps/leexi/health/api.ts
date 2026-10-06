/**
 * Is `public-api.leexi.ai` answering? An unsigned reachability probe.
 *
 * Measured 2026-10-06: `GET https://public-api.leexi.ai/v1/users` with no credential
 * returns HTTP 401 with an EMPTY `text/html` body, and an unknown path
 * (`/v1/definitely-not-real`) returns HTTP 404, also empty. So the application tells
 * "route exists, auth enforced" (401) from "no such route" (404) by status alone —
 * Leexi publishes no JSON error envelope to read. A 401 therefore proves DNS, TLS and
 * the application are working, and is a PASS; whether any key is good is the derived
 * `auth:basic` check's job. A Cloudflare 52x page is a 5xx and reads as down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of public-api.leexi.ai/v1/users. The documented 401 is the expected healthy answer; credential validity is the `auth:basic` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/users`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach public-api.leexi.ai: ${e}` };
    }
    await res.text().catch(() => "");

    if (res.status === 401) {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET /users returned ${res.status}; expected 401`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return { state: "degraded", message: `API returned an unexpected ${res.status}` };
  },
};

export default api;
