/**
 * Is Ringover's API answering — on THIS connection's region host? An unsigned reachability probe.
 *
 * With no credential the healthy answer is an authentication error. Measured 2026-10-06,
 * `GET /v2/teams` with no `Authorization` header returns HTTP 401 `{"error":"Missing API key"}`
 * (JSON, `content-type: application/json`) on both `public-api.ringover.com` and
 * `public-api-us.ringover.com`, while an unknown path returns a plain-text `404 page not found`,
 * so an HTML or text 200/404 is never mistaken for the API. A schema-correct `{error: string}`
 * 401 proves DNS, TLS and the application are working, so that is a PASS; whether the key is
 * good is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URLS, regionFrom } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /teams on the connection's region host. Ringover's documented 401 `{error}` answer is the expected healthy response; key validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const base = API_URLS[regionFrom(ctx.connection)];
    let res: Response;
    try {
      res = await ctx.fetch(`${base}/teams`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach ${base}: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { error?: unknown } | null = null;
    try {
      body = raw ? JSON.parse(raw) as { error?: unknown } : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status === 401 && typeof body?.error === "string") {
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
          `unauthenticated GET /teams returned ${res.status}; expected an authentication error`,
      };
    }
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${
        typeof body?.error === "string" ? body.error : raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
