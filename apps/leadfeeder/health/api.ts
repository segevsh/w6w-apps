/**
 * Is the Leadfeeder API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /v1/users/me`. **A schema-correct
 * auth error is a PASS.** Measured 2026-10-06: with no key the API answers HTTP 401
 * `{"errors":[{"code":"missing_token",…}],"meta":{"request_id":…}}`, which proves the
 * application (not just the CloudFront edge) is routing. The verdict is read from the body
 * (`errors[0].code` is a non-empty string), not the status. A 5xx is `down`; key validity is the
 * derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_HOST, vendorError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1/users/me. Leadfeeder's JSON `errors` envelope " +
    "(missing_token) passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/v1/users/me`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach ${API_HOST}: ${e}` };
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from ${API_HOST}`, ttlSeconds: 120 };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const err = vendorError(body);
    if (typeof err?.code === "string" && err.code !== "") {
      return {
        state: "ok",
        message: `${API_HOST} is serving (HTTP ${res.status}, ${err.code})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "degraded",
      message:
        `${API_HOST} answered HTTP ${res.status} with a body that is not Leadfeeder's error envelope`,
    };
  },
};

export default api;
