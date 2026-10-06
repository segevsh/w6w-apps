/**
 * Is e-conomic's API answering? An unsigned reachability probe.
 *
 * With no tokens the healthy answer is an authentication error. Measured 2026-10-06,
 * `GET https://restapi.e-conomic.com/self` with no headers returns HTTP 401
 * `{"message":"Unauthorized access (Unauthorized).","developerHint":...,"httpStatusCode":401,...}`
 * (`content-type: application/json`), and with wrong tokens 401
 * `{"message":"Token does not correspond to a valid grant.","errorCode":"E02250",...}`. A
 * schema-correct 401 `{message: string}` proves DNS, TLS and the application work, so it is a
 * PASS; whether the tokens are good is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /self. e-conomic's documented 401 JSON error is the expected healthy answer; token validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/self`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach ${BASE_URL}: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { message?: unknown } | null = null;
    try {
      body = raw ? JSON.parse(raw) as { message?: unknown } : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401 && typeof body?.message === "string") {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    if (res.ok) {
      return {
        state: "degraded",
        message:
          `unauthenticated GET /self returned ${res.status}; expected an authentication error`,
      };
    }
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${
        typeof body?.message === "string" ? body.message : raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
