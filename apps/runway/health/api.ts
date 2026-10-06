/**
 * Is the Runway API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /v1/organization`.
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no credential the
 * API answers `401 {"error":"No API key was provided. …","docUrl":"https://docs.dev.runwayml.com/api"}`,
 * which proves the application is serving. The verdict is read from the body (a string
 * `error` member), not the status alone, so a 401 from an unrelated proxy is `unknown`.
 * A 5xx is `down`. Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_VERSION, vendorMessage } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1/organization. Runway's JSON `error` envelope on a 401 " +
    "passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/v1/organization`, {
      headers: { accept: "application/json", "x-runway-version": API_VERSION },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from api.dev.runwayml.com`,
        ttlSeconds: 120,
      };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (res.ok || (res.status === 401 && vendorMessage(body) !== undefined)) {
      return {
        state: "ok",
        message: `api.dev.runwayml.com is serving (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `api.dev.runwayml.com answered HTTP ${res.status} with a body that is not Runway's error envelope`,
    };
  },
};

export default api;
