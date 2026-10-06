/**
 * Is `api.supadata.ai` answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /v1/me`. Measured 2026-10-06: with
 * no key the API's own application answers HTTP 401 with its JSON envelope
 * `{"error":"unauthorized","message":"Unauthorized","details":"Missing API Key",…}`, whereas the
 * Cloudflare edge would answer with a different body. **A schema-correct auth error is a PASS**: it
 * proves the application is serving. The verdict is read from the body's `error` code, not the
 * status. A 5xx is `down`; anything else (an HTML page, a different JSON) is `unknown`.
 * Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, isErrorEnvelope } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1/me. Supadata's own JSON `unauthorized` refusal passes — " +
    "it proves the application itself is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/me`, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from api.supadata.ai`, ttlSeconds: 120 };
    }
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (res.status === 401 && isErrorEnvelope(body) && body.error === "unauthorized") {
      return { state: "ok", message: "api.supadata.ai is serving (HTTP 401)", ttlSeconds: 120 };
    }
    if (res.ok && (body as { organizationId?: unknown } | null)?.organizationId) {
      return { state: "ok", message: "api.supadata.ai is serving", ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `api.supadata.ai answered HTTP ${res.status} with a body that is not Supadata's`,
    };
  },
};

export default api;
