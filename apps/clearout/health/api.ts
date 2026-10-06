/**
 * Is the Clearout API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /account/credits`.
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no credential the
 * API answers `401 {"status":"failed","error":{"code":1000,"message":"Invalid API Token,
 * please generate new token"}}`, which proves the application is serving. The verdict
 * is read from the body (`status: "failed"` + numeric `error.code`), not the status
 * alone, so a 401 from an unrelated proxy is `unknown`. A 5xx is `down`. Credential
 * validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /account/credits. Clearout's JSON `failed` envelope with " +
    "error code 1000 passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/account/credits`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from api.clearout.io`, ttlSeconds: 120 };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const err = vendorError(body);
    const envelope = (body as { status?: string } | undefined)?.status;
    if (res.ok || (envelope === "failed" && typeof err?.code === "number")) {
      return {
        state: "ok",
        message: `api.clearout.io is serving (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `api.clearout.io answered HTTP ${res.status} with a body that is not Clearout's error envelope`,
    };
  },
};

export default api;
