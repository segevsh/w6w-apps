/**
 * Is the Superchat API answering? An unsigned `GET /me`.
 *
 * Measured 2026-10-06 against `api.superchat.com/v1.0/me`: no key → `401` and
 * no key that works → `403`, both with an EMPTY body (`content-length: 0`). So
 * the auth-layer 401 is the proof of life; there is no vendor error body to
 * match. Key validity is the derived `auth:api-key` check's job. A `5xx` is the
 * API being down. Anything else (including a 200 with no key, which would mean
 * the route stopped authenticating) is `unknown`, never a pass.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1.0/me. The auth layer's empty 401 passes: it proves the " +
    "API and its gateway are answering. Key validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`, { headers: { accept: "application/json" } });
    await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (res.status === 401) {
      return { state: "ok", message: "HTTP 401 — the API is answering", ttlSeconds: 120 };
    }
    return { state: "unknown", message: `Unexpected HTTP ${res.status} from an unsigned probe` };
  },
};

export default api;
