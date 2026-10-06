/**
 * Is `api.klicktipp.com` answering like KlickTipp's API?
 *
 * `kind: "dependency"` and `credential: "none"`: the probe sends NO session and
 * no key, so an expired login can never make a healthy API look down — that is
 * the derived `auth:*` checks' job.
 *
 * Probe: unsigned `GET /tag`. Measured 2026-10-06, it answers HTTP 403 with the
 * body `["API access denied."]` — the vendor's documented AccessDenied shape (an
 * array of strings). A schema-correct auth refusal proves the API evaluated the
 * request, so that is a PASS. Only a transport failure, a 5xx, or a body that
 * is not that shape (an HTML error page or a catch-all 200) counts against it.
 * The response never contains a credential.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { BASE_URL, parseJson } from "../lib/client.ts";

export const PROBE_URL = `${BASE_URL}/tag`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /tag against api.klicktipp.com. Sends no session or key — " +
    "a schema-correct 'API access denied' proves the API is answering.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `api.klicktipp.com unreachable: ${String(err)}` };
    }
    if (res.status >= 500) return { state: "down", message: `GET /tag returned ${res.status}` };
    if (res.status === 429) {
      return { state: "degraded", message: "KlickTipp is rate limiting (429)", ttlSeconds: 120 };
    }
    const body = parseJson(await res.text().catch(() => ""));
    const isErrorShape = Array.isArray(body) && body.length > 0 &&
      body.every((m) => typeof m === "string");
    if ((res.status === 403 || res.status === 401) && isErrorShape) {
      return { state: "ok", ttlSeconds: 120 };
    }
    return {
      state: "down",
      message: `GET /tag returned HTTP ${res.status} without the documented error shape — ` +
        "this does not look like the KlickTipp API",
    };
  },
};

export default api;
