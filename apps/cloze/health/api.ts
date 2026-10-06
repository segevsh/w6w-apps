import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorMessage } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

export const PROBE_URL = `${API_BASE}${PROBE_PATH}`;

/**
 * Is the Cloze API answering?
 *
 * An unsigned `GET /v1/user/stages/people` answers 401 JSON with Cloze's own message
 * (`{"errorcode":1,"message":"The API key was not found"}`, measured 2026-10-06), which proves
 * the API gateway is serving. An unknown path is a 404 `{"errorcode":404,...}`, so a 401 here is
 * the auth layer, not a missing route. The verdict comes from the body (a JSON object with a
 * `message`), never the status alone; an HTML body is not the API. The credential is never
 * sent: whether the key works is the derived `auth:*` check's job.
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
    if (errorMessage(body) && (res.status === 401 || res.status === 403)) {
      return { state: "ok", message: `HTTP ${res.status}: API is serving`, ttlSeconds: 120 };
    }
    return { state: "unknown", message: `unexpected HTTP ${res.status} from the API probe` };
  },
};

export default api;
