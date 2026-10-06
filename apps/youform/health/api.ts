import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-token.ts";

/** `https://app.youform.com/api/me` — unsigned, so it answers 401 when healthy. */
export const PROBE_URL = `${API_URL}${PROBE_PATH}`;
export const UNAUTHENTICATED_BODY = "Unauthenticated.";

/**
 * Is the Youform API answering? An unsigned `GET /api/me` is rejected with
 * `401 {"message":"Unauthenticated."}` — a schema-correct auth error proves DNS,
 * TLS, Cloudflare and Laravel's auth middleware all ran, so that is the PASS.
 * The dashboard and API share one origin; an unrouted path answers a JSON 404,
 * which here means the API is no longer mounted, and an HTML body means an edge
 * error page. Credential validity is the derived `auth:*` check's job.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "Youform API reachable",
  description:
    'Unauthenticated GET https://app.youform.com/api/me. A 401 {"message":"Unauthenticated."} ' +
    "passes — it proves the API is serving.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text();

    let body: { message?: string } | null = null;
    try {
      body = JSON.parse(text) as { message?: string };
    } catch {
      return {
        state: "down",
        message: `app.youform.com/api returned a non-JSON body (HTTP ${res.status})`,
      };
    }

    if (res.status === 401) {
      return {
        state: "ok",
        message: body?.message === UNAUTHENTICATED_BODY ? undefined : body?.message,
        ttlSeconds: 120,
      };
    }
    if (res.status === 404) {
      return {
        state: "down",
        message: "app.youform.com/api/me 404s — the API is no longer mounted at /api",
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `app.youform.com returned HTTP ${res.status}` };
    }
    return {
      state: "unknown",
      message: `unexpected HTTP ${res.status} from an unauthenticated /api/me`,
    };
  },
};

export default api;
