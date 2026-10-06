import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, bareCode } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

export const PROBE_URL = `${API_BASE}${API_PREFIX}${PROBE_PATH}`;

/**
 * Is the seven gateway answering?
 *
 * An unsigned `GET /api/balance` answers HTTP 200 with the bare return code `900` (JSON `"900"`
 * under `Accept: application/json`, measured 2026-10-06), which proves the gateway and its auth
 * layer are serving. The verdict comes from that body, never the status: the gateway answers 200
 * to everything, so a 200 alone proves nothing. An HTML body (a proxy error page) is not the
 * API. Whether the key works is the derived `auth:api-key` check's job; no credential is sent.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${PROBE_URL}. The documented bare return code 900 proves the ` +
    "gateway is answering.",
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
    if (text.trimStart().startsWith("<")) {
      return { state: "unknown", message: `HTML body (HTTP ${res.status}), not the API` };
    }
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (bareCode(body) === "900") {
      return { state: "ok", message: "API is serving (code 900 without a key)", ttlSeconds: 120 };
    }
    if (
      body && typeof body === "object" && typeof (body as { amount?: unknown }).amount === "number"
    ) {
      return { state: "ok", ttlSeconds: 120 };
    }
    return { state: "unknown", message: `unexpected body (HTTP ${res.status}) from the API probe` };
  },
};

export default api;
