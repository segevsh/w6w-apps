/**
 * Is `api.peopledatalabs.com` answering? An unsigned reachability probe.
 *
 * With no credential the healthy answer is an authentication error. Measured 2026-10-06,
 * `GET https://api.peopledatalabs.com/v5/autocomplete?field=title&size=1` with no key returns
 * HTTP 401 `{"status":401,"error":{"type":["authentication_error"],"message":"Your request is
 * missing an api key."}}` (`type` is an array on the wire although the docs show a string). That
 * schema-correct error proves DNS, TLS and the application are working, so it is a PASS; whether
 * any key is good is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, errorTypes } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of api.peopledatalabs.com/v5/autocomplete. The 401 authentication_error envelope is the expected healthy answer; credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/v5/autocomplete?field=title&size=1`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.peopledatalabs.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401) {
      return errorTypes(body).includes("authentication_error")
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without PDL's JSON error envelope — an intermediary may be answering",
        };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated request returned ${res.status}; expected 401`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${raw.slice(0, 120)}`,
    };
  },
};

export default api;
