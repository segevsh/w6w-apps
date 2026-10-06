import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/** A syntactically valid workspace id that exists nowhere: the probe is unsigned and reads nothing. */
export const PROBE_WORKSPACE = "aaaaaaaaaaaa";
export const PROBE_URL = `${API_BASE}${API_PREFIX}/workspace/${PROBE_WORKSPACE}`;

/**
 * Is the Ninox API gateway answering?
 *
 * An unsigned `GET /workspace/aaaaaaaaaaaa` answers `401 text/plain` (`Workspace orchestrator
 * error`, measured 2026-10-06) — the gateway's own refusal, not the documented JSON envelope. That
 * is the "up" signature. The tempting failure mode is the opposite one: an unknown path under
 * `/api/v1` answers `200 text/html` (the Ninox web-app shell), so a 200 is *not* a pass. The
 * credential is never sent; whether the key works is the derived `auth:*` check's job.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${PROBE_URL}. A non-HTML 401 is the gateway refusing an unsigned ` +
    "request, which proves the API is answering; an HTML body is the web-app shell, not the API.",
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
      return { state: "unknown", message: `HTML body (HTTP ${res.status}) — not the API` };
    }
    if (res.status === 401 || res.status === 403) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return { state: "unknown", message: `unexpected HTTP ${res.status} from the API probe` };
  },
};

export default api;
