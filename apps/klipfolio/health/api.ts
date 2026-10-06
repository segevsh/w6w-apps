/**
 * Is `app.klipfolio.com/api` answering? An unsigned reachability probe.
 *
 * With no credential the healthy answer is an authentication error. Measured
 * 2026-10-06, `GET https://app.klipfolio.com/api/1.0/profile` with no header
 * returns HTTP 401 `{"meta":{"success":false,"status":401,
 * "error_code":"auth_not_provided",...}}`. A schema-correct error envelope
 * proves DNS, TLS and the application are working, so that is a PASS; whether
 * a key is good is the derived `auth:api-key` check's job. An unknown path on
 * this host answers an HTML 404, so an HTML body is never mistaken for the API.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type Meta } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /api/1.0/profile. Klipfolio's documented 401 error envelope is the expected healthy answer; credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/profile`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach app.klipfolio.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let meta: Meta | undefined;
    try {
      meta = (raw ? JSON.parse(raw) : null)?.meta;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401) {
      return typeof meta?.error_code === "string"
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without Klipfolio's error envelope — an intermediary may be answering",
        };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET /profile returned ${res.status}; expected 401`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${meta?.error_desc ?? raw.slice(0, 120)}`,
    };
  },
};

export default api;
