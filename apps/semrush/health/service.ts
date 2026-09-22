import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, parseSemrushError } from "../lib/client.ts";

/**
 * Is `api.semrush.com` answering the real API?
 *
 * ## There is no status page, and this says so out loud
 *
 * SEMrush publishes **no reachable public status page**. Verified live on
 * 2026-09-22: `semrush.statuspage.io` redirects to Atlassian's generic
 * marketing page rather than serving a status feed, and `status.semrush.com`
 * does not resolve at all (DNS NXDOMAIN). Since this pack's convention is that
 * a declared absence is a positive fact and carries
 * `severity: "informational"` (see `packages/apps/HEALTHCHECKS.md`), this check
 * is `informational`: it never hard-fails a roll-up on its own.
 *
 * That severity is doing real work here. A `service` check would normally be
 * `degraded` by default, and the verdict below can legitimately be `unknown`
 * when the probe cannot interpret what it got — at `degraded` a transient
 * probe failure would pin the whole app at a worse state.
 *
 * ## An unsigned 401 is a PASS
 *
 * The probe is a `GET` of the same overview endpoint the app's first Action
 * uses, with **no credential at all**. A live API answers:
 *
 *     HTTP/2 401
 *     {"meta":{"success":false,"status_code":401,"request_id":"…"},
 *      "error":{"code":401,"message":"Unauthorized","retryable":false}}
 *
 * — measured live on 2026-09-22, including against a syntactically plausible
 * but invalid key, which returns the byte-identical shape. A schema-correct
 * error envelope proves the host parsed the request, ran its authenticator and
 * produced its own documented response — which is exactly what this check
 * claims and nothing more. Whether a particular key is live is the derived
 * `auth:api-key` check's job, and it uses the free balance endpoint rather than
 * a paid report (see `auth/api-key.ts`).
 *
 * ## Never `down`
 *
 * `down` is reserved for a vendor that can be shown to be broken. Without a
 * status feed, a 5xx, a non-JSON body and a transport failure are all
 * indistinguishable from "this probe broke, or something in front of the API
 * answered instead" — so every non-pass comes back `unknown`.
 *
 * `credential: "none"`, so `sign` never runs and no API key is sent. The probe
 * declares no extra egress: `api.semrush.com` is the app's own host and is
 * already in `w6w.network.allow`.
 */

/** What a healthy, unauthenticated probe is documented and measured to return. */
export const EXPECTED_STATUS = 401;

export const PROBE_URL =
  `${API_BASE}${API_PREFIX}/backlinks/v1/overview?url=example.com&scope=ROOT_DOMAIN`;

const service: HealthCheckDefinition = {
  key: "service",
  title: "SEMrush API reachability",
  description:
    "Unauthenticated GET /apis/v4/backlinks/v1/overview against api.semrush.com. A schema-correct " +
    "401 error envelope is a pass: it proves the API parsed the request and answered with its " +
    "own documented error shape. Whether a given key is live is the derived auth check's job.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (e) {
      return {
        state: "unknown",
        message: `api.semrush.com is unreachable: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    const raw = await res.text().catch(() => "");
    const envelope = parseSemrushError(raw);

    if (res.status === EXPECTED_STATUS && envelope) {
      return {
        state: "ok",
        message: `api.semrush.com answered the documented ${EXPECTED_STATUS} error envelope`,
        ttlSeconds: 60,
      };
    }

    // Deliberately `unknown` rather than `down` in every branch below: a 5xx, a
    // CDN page or a body that is not the documented envelope says something
    // about this probe, not necessarily about SEMrush.
    return {
      state: "unknown",
      message: `api.semrush.com returned HTTP ${res.status} to an unsigned probe${
        envelope ? "" : " with no readable error envelope"
      }`,
      ttlSeconds: 60,
    };
  },
};

export default service;
