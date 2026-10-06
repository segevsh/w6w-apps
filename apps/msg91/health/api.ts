import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorMessage, isFailureBody } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}/whatsapp/whatsapp-activation/`;

/**
 * Is the MSG91 API answering?
 *
 * An unsigned `GET /whatsapp/whatsapp-activation/` answers 401 JSON
 * `{"status":"fail","hasError":true,"errors":"Unauthorized","code":"401","apiError":"201"}`
 * (measured 2026-10-06; the `content-type` header says text/html but the body is JSON, so the
 * body is what is parsed). An unknown path is a 404 `{"type":"error","msg":"Route Missing"}`,
 * so a schema-correct 401 here is the auth layer, not a missing route. The verdict comes from
 * the body (a failure envelope with a message), never the status alone; an HTML body is not the
 * API. The credential is never sent: whether the key works is the derived `auth:*` check's job.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${PROBE_URL}. A schema-correct JSON refusal proves the API is ` +
    "answering; an HTML body is not the API.",
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
    if (
      (res.status === 401 || res.status === 403) && isFailureBody(body) && errorMessage(body)
    ) {
      return { state: "ok", message: `HTTP ${res.status}: API is serving`, ttlSeconds: 120 };
    }
    return { state: "unknown", message: `unexpected HTTP ${res.status} from the API probe` };
  },
};

export default api;
