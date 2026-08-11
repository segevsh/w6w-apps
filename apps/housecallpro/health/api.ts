import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/**
 * Is the Housecall Pro API answering?
 *
 * The vendor's status page describes nineteen components and none of them is
 * `api.housecallpro.com` (see `health/service.ts`). So the vendor publishes
 * nothing out-of-band about the one host every action here talks to, and an
 * unsigned request to that host is the only external signal that exists.
 *
 * ## A 401 is the PASS
 *
 * The probe carries no credential, so Housecall Pro rejects it — measured live
 * on 2026-08-11:
 *
 *     HTTP/2 401
 *     content-type: application/json; charset=utf-8
 *     x-runtime: 0.008927
 *     {"message":"Unauthorized"}                          (26 bytes)
 *
 * That is the strongest evidence available that the service is healthy: DNS
 * resolved, TLS terminated, the Rails router matched `/company`, and the
 * authentication filter ran and answered in its own documented shape. Judging
 * this check by the HTTP status would report Housecall Pro as permanently down.
 *
 * The corollary matters as much: this check must **not** be read as a statement
 * about anybody's credential. It carries none. Whether a key is any good is the
 * derived `auth:*` check's job, and conflating the two is how "Housecall Pro had
 * an outage" gets misreported as "your key expired".
 *
 * ## What counts as a failure
 *
 *  - **A non-JSON body**, or a body without the vendor's `message` key, means
 *    something that is not the Housecall Pro API answered — an edge error page,
 *    a captive portal, a parked domain. `down`.
 *  - **A 2xx** would mean `/company` had become readable without a credential,
 *    which would be a security regression rather than good news, so it is
 *    reported as `degraded` with the reason rather than silently passing.
 *  - **A 404 or 5xx** means the route this app's auth probe depends on is gone
 *    or the backend is failing. `down`.
 *  - A transport failure surfaces as the hook throwing, which the host records.
 *
 * ## Annotation
 *
 *  - `kind: "dependency"` — deliberately not `service`. It proves *the API is
 *    answering us*, which is a narrower and weaker claim than "the vendor has
 *    declared itself healthy"; filing it as `service` would overstate what one
 *    unauthenticated request can know.
 *  - `scope: "app"` — `api.housecallpro.com` is a single shared host with no
 *    per-tenant subdomain, so the answer is identical for every Connection and
 *    running it per-Connection would multiply one useful call by the number of
 *    users.
 *  - `credential: "none"` — `sign` must not run. A health probe that spends a
 *    Pro's own credential to prove the vendor is up is measuring the wrong
 *    thing, and Housecall Pro publishes no rate-limit headroom to spend it
 *    against (see `health/quota.ts`).
 *  - **No `network.allow`.** `api.housecallpro.com` is already the app's own
 *    egress host; there is nothing to widen.
 */

/** `https://api.housecallpro.com/company` — the same route the auth probes use, unsigned. */
export const PROBE_URL = `${API_BASE}${PROBE_PATH}`;

/** The body Housecall Pro returns for an unauthenticated request, verbatim. */
export const EXPECTED_401_MESSAGE = "Unauthorized";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Housecall Pro API reachability",
  description:
    "Unsigned GET https://api.housecallpro.com/company. A 401 with Housecall Pro's own " +
    '`{"message":"Unauthorized"}` body is the pass: it proves the API routed and answered. ' +
    "This says nothing about any credential.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");

    let body: { message?: string } | null = null;
    try {
      body = JSON.parse(text) as { message?: string };
    } catch { /* not JSON — handled below */ }

    if (res.status === 401) {
      if (typeof body?.message === "string") {
        return { state: "ok", message: `API answered 401 ${body.message}`, ttlSeconds: 60 };
      }
      return {
        state: "down",
        message: "401 without Housecall Pro's JSON error body — something other than the API " +
          "answered",
      };
    }

    if (res.ok) {
      return {
        state: "degraded",
        message: `${PROBE_PATH} answered ${res.status} with no credential; it is documented as ` +
          "requiring one",
      };
    }

    return {
      state: "down",
      message: `API returned HTTP ${res.status} for ${PROBE_PATH}`,
    };
  },
};

export default api;
