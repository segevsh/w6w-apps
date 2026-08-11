/**
 * Is the Productboard **API** answering, and does the v2 route still exist?
 *
 * This is a different question from both of its neighbours, which is why it is
 * a separate check:
 *
 *  - `health/service.ts` asks the vendor's status page, which is a human-curated
 *    document that lags a real incident and can itself be down.
 *  - the derived `auth:api-token` check asks whether *this credential* works,
 *    which conflates "the token expired" with "the endpoint moved".
 *  - this check asks whether `api.productboard.com` is reachable and still
 *    routing `/v2/entities/configurations`, with no credential involved at all.
 *
 * ## Why an unsigned 401 is a PASS
 *
 * The probe is deliberately unauthenticated (`credential: "none"`), so a
 * schema-correct authentication error is the *success* case: it proves DNS
 * resolved, TLS completed, the gateway is up, and the route exists. Whether the
 * credential is any good is the derived `auth:*` check's job. Conflating the two
 * is how "Productboard's API is down" gets reported as "your token expired".
 *
 * ## Why the route check is worth a whole check on this vendor
 *
 * Measured on 2026-08-11, `api.productboard.com` answers a *nonexistent* v2
 * path with `404` and the body
 * `{"errors":[{"code":"route.notFound",…}],"id":…}` — **before** it checks
 * authentication, since the same request with no credential at all still gets
 * the 404 rather than a 401. So an unsigned probe can distinguish the two
 * outcomes exactly:
 *
 *   | Unsigned `GET /v2/entities/configurations` | Verdict    | Meaning                       |
 *   | ------------------------------------------ | ---------- | ----------------------------- |
 *   | 401 `{"message":"Unauthorized"}`           | `ok`       | reachable, route alive        |
 *   | 404 `route.notFound`                       | `down`     | the v2 path moved             |
 *   | 5xx                                        | `down`     | the API is failing            |
 *   | 200 with no credential                     | `degraded` | should be impossible — say so |
 *   | anything else                              | `unknown`  | do not guess                  |
 *
 * ## `HEAD` would invert this entire check
 *
 * `HEAD https://api.productboard.com/v2/entities` answers **404** with the
 * `route.notFound` body, while `GET` on the identical URL answers **401**
 * (measured 2026-08-11, both). `HEAD` is the obvious verb for a probe that does
 * not want a body — and on this API it reports a healthy route as a dead one,
 * permanently. This check uses `GET`, and `tests/health/api.test.ts` pins that.
 *
 * `severity: "degraded"` rather than `fatal`: this probe cannot see anything a
 * failing Action would not also see, and a transient gateway blip should not
 * make the App's verdict fatal on its own.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-token.ts";

export const REACHABILITY_URL = `${API_BASE}${API_PREFIX}${PROBE_PATH}`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "Productboard API reachability",
  description:
    "Unauthenticated GET against api.productboard.com/v2. A 401 is a pass — it proves the host " +
    "resolves and the v2 route is alive. A 404 route.notFound means the path moved, which is a " +
    "different problem from an expired token.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      // GET, never HEAD — see the header. No Authorization header: this probe
      // is unsigned by declaration, and `sign` never runs for `credential: "none"`.
      res = await ctx.fetch(REACHABILITY_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `api.productboard.com is unreachable: ${(err as Error).message}`,
      };
    }

    const body = await res.json().catch(() => null) as
      | { message?: string; errors?: Array<{ code?: string }> }
      | null;
    const code = body?.errors?.[0]?.code;

    if (res.status === 401) {
      return {
        state: "ok",
        message: "API answering; unsigned request correctly refused",
        ttlSeconds: 60,
      };
    }
    if (code === "route.notFound") {
      return {
        state: "down",
        message: `Productboard no longer routes ${API_PREFIX}${PROBE_PATH} — the v2 API moved`,
      };
    }
    if (res.status === 404) {
      return { state: "down", message: `API returned 404 for ${API_PREFIX}${PROBE_PATH}` };
    }
    if (res.status >= 500) {
      return { state: "down", message: `API returned ${res.status}` };
    }
    if (res.ok) {
      // Productboard requires a credential on every v2 path; a 200 here would
      // mean the endpoint stopped requiring one, which would silently turn the
      // derived auth check into a no-op.
      return {
        state: "degraded",
        message: `${API_PREFIX}${PROBE_PATH} answered ${res.status} with no credential — the ` +
          "auth probe can no longer detect a missing token",
      };
    }
    return { state: "unknown", message: `API returned ${res.status}` };
  },
};

export default api;
