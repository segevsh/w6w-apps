/**
 * Is `api.rootly.com` answering? — `kind: "dependency"`, `credential: "none"`.
 *
 * An unsigned `GET /v1/users/me`. Measured 2026-10-06, the application refuses an
 * unauthenticated request with `401` and `{"errors":[{"title":"Invalid token","status":"401"}]}`
 * (media type `application/vnd.api+json`), which is how the API answers when it is up, so a
 * **schema-correct auth error is a PASS**. The verdict is read from the BODY: a JSON `errors`
 * array passes; anything else (a Cloudflare error page, an HTML 401) is `unknown`, not `ok`,
 * because it would prove only that the edge is up. A 5xx is `down`; a transport failure
 * surfaces as the hook throwing. Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, CONTENT_TYPE } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1/users/me. Rootly's JSON `errors` 401 passes: it proves " +
    "the application itself is answering, not just Cloudflare in front of it.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v1/users/me`, { headers: { accept: CONTENT_TYPE } });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from api.rootly.com`, ttlSeconds: 120 };
    }
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (Array.isArray((body as { errors?: unknown } | null)?.errors)) {
      return {
        state: "ok",
        message: `api.rootly.com is serving (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `api.rootly.com answered HTTP ${res.status} with a body that is not Rootly's JSON errors document`,
    };
  },
};

export default api;
