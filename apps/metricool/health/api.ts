import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}/v2/health`;

/**
 * Is the Metricool API serving?
 *
 * `GET /v2/health` is in the vendor's reference ("Health Check API", liveness check) and needs no
 * credential. Measured 2026-10-06: `200 application/json {"status":"UP","message":"Application is
 * healthy","timestamp":…}`. It passes only on that documented body, so a 200 SPA/HTML shell or a
 * generic 200 is `unknown`. The deeper `/v2/health/ready` lists internal databases and is not used.
 * Whether the user token works is the derived `auth:*` check's job.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${PROBE_URL}; passes only on the documented {"status":"UP"} body.`,
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    let body: { status?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      return { state: "unknown", message: `non-JSON body (HTTP ${res.status}), not the API` };
    }
    if (res.ok && body?.status === "UP") return { state: "ok", ttlSeconds: 120 };
    if (res.ok && (body?.status === "DOWN" || body?.status === "NOT_READY")) {
      return { state: "down", message: `health status ${body.status}`, ttlSeconds: 120 };
    }
    return { state: "unknown", message: `unexpected HTTP ${res.status} from the health probe` };
  },
};

export default api;
