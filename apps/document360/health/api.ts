/**
 * Is the Document360 API Hub answering for THIS connection's data center?
 *
 * Document360 publishes no readable status feed (see `service.ts`), so reachability of the host
 * the Connection points at is the one out-of-band signal there is.
 *
 *   - `kind: "dependency"`, `scope: "connection"` — the host depends on the Connection's region.
 *   - `credential: "context"` — the Connection supplies the host; no credential is sent.
 *
 * **An unsigned auth rejection is a PASS.** An unsigned `GET /v3/projects` answers
 * `401` with `www-authenticate: Bearer` and an EMPTY body on all three hosts (measured
 * 2026-10-06; the gateway does not emit problem+json for a 401). That proves DNS, TLS and
 * Document360's gateway ran. A problem+json body, or a 2xx, also passes. A 5xx is `down`; an
 * HTML body (a CDN or error shell) is `down`; anything unrecognised is `unknown`. Credential
 * validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { apiBase, baseHeaders, resolveRegion } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET /v3/projects on this connection's data center. Document360's 401 " +
    "(empty body, www-authenticate: Bearer) or a problem+json answer proves the API Hub is " +
    "serving. Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const region = resolveRegion(ctx.connection);
    const res = await ctx.fetch(`${apiBase(region)}${PROBE_PATH}?page_size=1`, {
      headers: baseHeaders(),
    });
    const text = await res.text();
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from the ${region} API Hub`,
        ttlSeconds: 120,
      };
    }
    const type = res.headers.get("content-type") ?? "";
    if (/text\/html/i.test(type) || /^\s*</.test(text)) {
      return {
        state: "down",
        message: `HTML answer from the ${region} API Hub (HTTP ${res.status})`,
      };
    }
    if (res.ok) {
      return { state: "ok", message: `HTTP ${res.status} — API Hub is serving`, ttlSeconds: 120 };
    }
    if (text === "") {
      if (res.status === 401 && /bearer/i.test(res.headers.get("www-authenticate") ?? "")) {
        return { state: "ok", message: "HTTP 401 — API Hub is serving", ttlSeconds: 120 };
      }
      return { state: "unknown", message: `empty body with HTTP ${res.status}` };
    }
    try {
      const body = JSON.parse(text) as { errors?: unknown; status?: unknown };
      if (Array.isArray(body.errors) || typeof body.status === "number") {
        return { state: "ok", message: `HTTP ${res.status} — API Hub is serving`, ttlSeconds: 120 };
      }
    } catch {
      // fall through
    }
    return { state: "unknown", message: `unrecognised answer (HTTP ${res.status})` };
  },
};

export default api;
