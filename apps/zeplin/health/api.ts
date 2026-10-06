/**
 * Is `api.zeplin.dev` answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /v1/users/me`. Measured 2026-10-06:
 * with no token the application answers HTTP 401 with its own JSON
 * `{"message":"invalid_token","detail":"Authorization header is missing"}`; with a bogus token,
 * `{"message":"invalid_token"}`. **A schema-correct auth error is a PASS**: it proves the
 * application is serving. The verdict is read from the body's `message`, not the status. A 5xx is
 * `down`; anything else (an HTML page, a different JSON) is `unknown`. Credential validity is the
 * derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1/users/me. Zeplin's own JSON `invalid_token` refusal " +
    "passes — it proves the application itself is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/users/me`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from api.zeplin.dev`, ttlSeconds: 120 };
    }
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (
      res.status === 401 && typeof body?.message === "string" &&
      /invalid_token/i.test(body.message)
    ) {
      return { state: "ok", message: "api.zeplin.dev is serving (HTTP 401)", ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `api.zeplin.dev answered HTTP ${res.status} with a body that is not its own`,
    };
  },
};

export default api;
