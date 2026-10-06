import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, errorParts, isThrottled } from "../lib/client.ts";

/**
 * Is the API answering? — an unsigned `GET /users`.
 *
 * With no credential the API answers HTTP 401 with its own JSON envelope
 * (`{"status":401,"message":"Authorization data not found","error_name":
 * "authorization_data_not_found",…}`, verified live 2026-10-06). A schema-correct error body like
 * that proves the API and its auth layer are serving, so it is a **pass**; whether a particular
 * credential is valid is the derived `auth:basic` check's job.
 *
 * The verdict is read from the body's `error_name`, never from the HTTP status alone. An HTML
 * page, or JSON without `error_name`, is not the API.
 */
const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: `Unsigned GET ${API_URL}/users. A 401 carrying OnePageCRM's own error envelope ` +
    "(`error_name`) passes: it proves the API is answering. Credential validity is the derived " +
    "`auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users`, { headers: { accept: "application/json" } });
    const text = await res.text();
    if (isThrottled(res.status, res.headers.get("content-type"), text)) {
      return { state: "unknown", message: "request-rate throttled; no verdict", ttlSeconds: 120 };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return {
        state: "down",
        message: `endpoint returned a non-JSON body (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    const { name } = errorParts(payload);
    if (name === "service_unavailable" || res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (name !== undefined) {
      return {
        state: "ok",
        message: `HTTP ${res.status} (${name}) — API is serving`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message: `JSON body was not an OnePageCRM error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
