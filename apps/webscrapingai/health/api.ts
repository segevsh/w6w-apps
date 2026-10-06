/**
 * Is `api.webscraping.ai` answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /account`. Measured 2026-10-06:
 * with no key the application answers HTTP 403 with its own JSON `{"message":"Wrong API key."}`.
 * **A schema-correct auth error is a PASS**: it proves the application is serving. The verdict is
 * read from the body's `message`, not the status. A 5xx is `down`; anything else (an HTML page, a
 * different JSON) is `unknown`. Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /account. WebScraping.AI's own JSON `Wrong API key` refusal " +
    "passes — it proves the application itself is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/account`, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from api.webscraping.ai`,
        ttlSeconds: 120,
      };
    }
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (
      res.status === 403 && typeof body?.message === "string" &&
      /api key/i.test(body.message)
    ) {
      return { state: "ok", message: "api.webscraping.ai is serving (HTTP 403)", ttlSeconds: 120 };
    }
    if (res.ok && typeof body?.remaining_total_credits === "number") {
      return { state: "ok", message: "api.webscraping.ai is serving", ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `api.webscraping.ai answered HTTP ${res.status} with a body that is not its own`,
    };
  },
};

export default api;
