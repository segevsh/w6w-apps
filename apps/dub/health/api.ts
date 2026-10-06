/**
 * Is `api.dub.co` answering? An unsigned reachability probe.
 *
 * With no credential the healthy answer is an authentication error. Measured
 * 2026-10-06, `GET https://api.dub.co/links` with no header returns HTTP 401
 * `{"error":{"code":"unauthorized","message":"Missing Authorization header.","doc_url":…}}`.
 * A schema-correct error envelope proves DNS, TLS and the application are
 * working, so that is a PASS; whether any key is good is the derived
 * `auth:api-key` check's job. An unknown path on this host answers an HTML 404,
 * so an HTML body is never mistaken for the API.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type DubErrorBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of api.dub.co/links. Dub's documented 401 error envelope is the expected healthy answer; credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/links`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach api.dub.co: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: DubErrorBody | null = null;
    try {
      body = raw ? JSON.parse(raw) as DubErrorBody : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401) {
      const shaped = typeof body?.error?.code === "string" &&
        typeof body?.error?.message === "string";
      return shaped
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without Dub's error envelope — an intermediary may be answering",
        };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET /links returned ${res.status}; expected 401`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${
        body?.error?.message ?? raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
