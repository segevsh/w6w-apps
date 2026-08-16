/**
 * Is the tl;dv API host itself answering?
 *
 * tl;dv ships something most vendors in this pack do not: a dedicated,
 * documented, UNAUTHENTICATED health route, `GET /v1alpha1/health` →
 * `{"status":"ok"}` (`HealthController.get`, tag `"Health check"` in the
 * OpenAPI document). Measured live on 2026-08-16 with no key, an empty key and
 * a garbage key — all three answer `200 {"status":"ok"}` identically, so this
 * route proves nothing about a CREDENTIAL (that's the derived `auth:api-key`
 * check's job). What it proves is narrower and mechanical: is `pasta.tldv.io`
 * itself up and routing to the app, right now, complementing the
 * human-updated `service` check above.
 *
 * **It is a real dedicated route, not a catch-all echoing 200 for anything.**
 * `GET /v1alpha1/definitely-not-real-zzz` answers a clean `404` with Express's
 * own `Cannot GET ...` body, and `POST /v1alpha1/health` (wrong method) also
 * `404`s — so this is a genuinely mounted, GET-only endpoint, not a proxy that
 * happens to 200 everything.
 *
 * ## Annotation
 *
 *  - `kind: "dependency"` — a different question from "is the vendor up"
 *    (`service`, a human-updated status page) and "is this key live" (the
 *    derived `auth:api-key` check).
 *  - `scope: "app"` — one shared host, no per-tenant subdomain, so the answer
 *    is identical for every Connection.
 *  - `credential: "none"` — `sign` must not run: the whole point of this probe
 *    is that it needs no credential, and running it signed would tell us
 *    nothing extra while spending a request against nothing metered.
 *  - No `network.allow` — `pasta.tldv.io` is already the app's own egress
 *    host; there is nothing to widen.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const HEALTH_URL = `${API_BASE}${API_PREFIX}/health`;

interface HealthBody {
  status?: string;
}

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /v1alpha1/health, tl;dv's own dedicated health route. A 200 with " +
    '{"status":"ok"} is the pass. Credential validity is the derived auth:api-key check\'s job.',
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(HEALTH_URL, { headers: { accept: "application/json" } });

    if (res.status >= 500) return { state: "down", message: `tl;dv returned ${res.status}` };
    if (res.status === 429) return { state: "degraded", message: "tl;dv rate-limited the probe" };

    const body = await res.json().catch(() => null) as HealthBody | null;
    const status = body?.status;

    if (res.ok && typeof status === "string" && status.length > 0) {
      return status.toLowerCase() === "ok" ? { state: "ok", ttlSeconds: 60 } : {
        state: "degraded",
        message: `/health reported status "${status}"`,
        ttlSeconds: 60,
      };
    }

    if (res.ok) {
      return {
        state: "unknown",
        message: "200 but the body carried no readable `status` field",
      };
    }

    return {
      state: "unknown",
      message: `/v1alpha1/health returned an unexpected ${res.status}`,
    };
  },
};

export default api;
