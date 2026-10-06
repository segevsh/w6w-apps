import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, API_VERSION } from "../lib/client.ts";

/**
 * Unsigned `GET /v1/groups?limit=1`. The API gateway answers 401 with
 * `{"error":{"code":"unauthorized","message":"Unauthorized"}}` before it even
 * looks at the version header (measured 2026-10-06), and that schema-correct
 * error proves the API is serving. Whether the token is valid is the derived
 * `auth:*` check's job.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET api.certifier.io/v1/groups. Certifier's own JSON 401 passes: it proves " +
    "the API is answering. Key validity is the derived auth check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}/groups?limit=1`, {
        headers: { accept: "application/json", "certifier-version": API_VERSION },
      });
    } catch (err) {
      return { state: "down", message: `could not reach api.certifier.io: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (res.status === 429) {
      return { state: "degraded", message: "rate limited (HTTP 429)", ttlSeconds: 120 };
    }
    const body = await res.json().catch(() => null) as
      | { error?: { code?: string } }
      | null;
    if (typeof body?.error?.code === "string") {
      return {
        state: "ok",
        message: `HTTP ${res.status} ${body.error.code} — API is serving`,
        latencyMs,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message: `body was not a Certifier response (HTTP ${res.status})`,
    };
  },
};

export default api;
