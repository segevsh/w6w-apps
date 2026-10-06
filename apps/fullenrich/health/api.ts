/**
 * Is `app.fullenrich.com/api/v2` answering? An unsigned reachability probe.
 *
 * Measured 2026-10-06: `GET /account/credits` with no header answers HTTP 401
 * `{"code":"error.authorization.not_set","message":"Authorization headers not set"}`
 * (`content-type: application/json`); an unknown path answers 404
 * `{"code":"error.api.not_found",…}`. A schema-correct `{code,message}` 401 proves
 * DNS, TLS and the application are working, so that is a PASS; whether any key
 * is good is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type FullEnrichErrorBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /account/credits. FullEnrich's documented 401 `{code, message}` envelope is the expected healthy answer; credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/account/credits`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach the FullEnrich API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: FullEnrichErrorBody | null = null;
    try {
      body = raw ? JSON.parse(raw) as FullEnrichErrorBody : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401) {
      const shaped = typeof body?.code === "string" && typeof body?.message === "string";
      return shaped
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without FullEnrich's error envelope — an intermediary may be answering",
        };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET /account/credits returned ${res.status}; expected 401`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${body?.message ?? raw.slice(0, 120)}`,
    };
  },
};

export default api;
