/**
 * Is the Upsales API host reachable?
 *
 * An **unsigned** probe of `GET /api/v2/self`. Measured 2026-10-06: with no key it answers
 * `401`, `content-type: text/plain`, body exactly `Unauthorized` (12 bytes), and it carries
 * `X-RateLimit-*` headers — i.e. the real API's own gate answered, not a proxy or SPA shell.
 *
 * A schema-correct auth refusal proves reachability, so it is a **pass**. The body, not
 * the status, decides: a `401` with an HTML page is a proxy/login wall (`degraded`), and a
 * `200` is not what an unsigned call should get (`degraded`: something other than the API is
 * answering). 5xx and a network failure are `down`; 429 is `degraded`.
 *
 * Unsigned on purpose: this question is "is the host up", independent of whether this
 * connection's key is valid (that is the derived `auth:api-key` check).
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}${API_PREFIX}/self`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "Upsales API reachable",
  description: "Unsigned GET /api/v2/self: the API answering 401 Unauthorized proves the host " +
    "and its auth layer are up.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  network: { allow: ["integration.upsales.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach integration.upsales.com: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const body = (await res.text().catch(() => "")).trim();

    if (res.status >= 500) {
      return { state: "down", message: `Upsales answered ${res.status}`, latencyMs };
    }
    if (res.status === 429) {
      return { state: "degraded", message: "Upsales is rate-limiting this probe", latencyMs };
    }
    if (res.status === 401 && /^unauthorized$/i.test(body)) {
      return { state: "ok", message: "API answered 401 Unauthorized as expected", latencyMs };
    }
    if (res.status === 401) {
      try {
        const j = JSON.parse(body);
        if (j && typeof j === "object" && (j.error || j.errors)) {
          return { state: "ok", message: "API answered with its JSON auth error", latencyMs };
        }
      } catch {
        // fall through to the unrecognised-body report
      }
    }
    return {
      state: "degraded",
      message: `GET /api/v2/self unsigned answered ${res.status} with an unrecognised body ` +
        `(${JSON.stringify(body.slice(0, 40))}) — likely a proxy or login page, not the API`,
      latencyMs,
    };
  },
};

export default api;
