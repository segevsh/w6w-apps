/**
 * Is `app.formbricks.com` answering? An unsigned probe of the documented
 * `GET /health` endpoint, which "makes sure the App & the Database are connected".
 *
 * Measured 2026-10-06: it answers `200 application/json {"status":"ok"}`; an unknown path
 * (`/api/v1/nope`) answers 404 with the HTML app shell, so a 200 JSON `status: ok` body is
 * not a catch-all. A 5xx (the docs show an HTML 500 page when the database is down) is
 * down. Credential validity is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_HOST } from "../lib/client.ts";

export const HEALTH_URL = `https://${API_HOST}/health`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    'Unauthenticated GET of app.formbricks.com/health; the body must be `{status:"ok"}`.',
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(HEALTH_URL, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach ${API_HOST}: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) return { state: "down", message: `/health returned ${res.status}` };
    if (!res.ok) return { state: "degraded", message: `/health returned ${res.status}` };

    let body: { status?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (body?.status === "ok") return { state: "ok", ttlSeconds: 60 };
    return {
      state: "degraded",
      message: '/health answered 200 but not with the documented {status:"ok"} body',
    };
  },
};

export default api;
