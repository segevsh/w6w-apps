import type { HealthCheckDefinition } from "@w6w/types";
import { PRODUCTION_API } from "../lib/client.ts";

/**
 * Unsigned reachability probe on `GET /rest/v1.0/me`.
 *
 * Measured 2026-10-06: with no credential the production API answers
 * `401 {"error":"Invalid Token"}`, and with a stale token
 * `401 {"errors":"Your access token has expired, ..."}` — Procore's own JSON
 * error envelope in both cases. Either body proves the gateway and its auth layer
 * are answering, which is a pass; whether a particular credential is valid is the
 * derived `auth:*` check's job. A 5xx, a non-JSON body (an edge page) or a JSON
 * body without either key is not that envelope.
 *
 * The verdict is read from the body, never the status code alone.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    `Unsigned GET ${PRODUCTION_API}/rest/v1.0/me. Procore's own JSON 401 error body proves the ` +
    "API is answering; credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${PRODUCTION_API}/rest/v1.0/me`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "unknown", message: `non-JSON body (HTTP ${res.status})` };
    }
    const envelope = typeof payload === "object" && payload !== null &&
      ("error" in payload || "errors" in payload || "id" in payload);
    if (envelope) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Procore envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
