/**
 * Is the Beeminder API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /users/me.json`.
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no token the API answers
 * `401 {"errors":{"message":"Token missing or incorrect token.","token":"no_token"}}`, which
 * proves the application is serving. An unknown path is a different shape
 * (`404 {"error":"The requested resource was not found."}`), so the verdict is read from the
 * body (an `errors` object on a 401), not the status alone; a 401 or 200 from an unrelated proxy
 * is `unknown`. A 5xx is `down`. Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /users/me.json. Beeminder's JSON `errors` object on a 401 " +
    "passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/users/me.json`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from www.beeminder.com`,
        ttlSeconds: 120,
      };
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    const errors = (body as { errors?: unknown } | undefined)?.errors;
    if (res.status === 401 && errors !== null && typeof errors === "object") {
      return {
        state: "ok",
        message: `www.beeminder.com is serving (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `www.beeminder.com answered HTTP ${res.status} with a body that is not Beeminder's auth error`,
    };
  },
};

export default api;
