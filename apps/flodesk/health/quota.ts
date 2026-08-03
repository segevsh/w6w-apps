/**
 * How much rate-limit headroom is left on THIS connection — Flodesk.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the connection live"; this answers "will the next call
 *     succeed or 429".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: Flodesk meters per account, and reading the counters
 *     requires a signed call.
 *   - No `network.allow` of its own — `api.flodesk.com` is already the app's
 *     single egress entry, which is what makes signing this probe safe. The spec
 *     forbids widening egress alongside a signed posture.
 *   - `severity: "informational"` — being near the limit is worth showing and
 *     never worth failing a verdict over; a 429 is a wait, not an outage.
 *
 * ## What Flodesk actually publishes
 *
 * Its "Rate Limiting" section states the allowances and shows the headers
 * verbatim:
 *
 *     HTTP/1.1 200 OK
 *     Status: 200 OK
 *     X-Fd-RateLimit-Limit: 100
 *     X-Fd-RateLimit-Remaining: 68
 *
 * | Endpoint                   | Limit               |
 * | -------------------------- | ------------------- |
 * | All endpoints (default)    | 100 requests/minute |
 * | `POST /v1/subscribers/batch` | 20 requests/minute |
 *
 * So unlike Kit (which documents an allowance but emits no counter), there IS
 * something real to read here.
 *
 * ## The probe
 *
 * `GET /v1/segments/colors` — the cheapest authenticated call in the surface. It
 * returns a fixed array of hex strings: no pagination, no account data, no
 * per-account work for Flodesk to do. Flodesk API keys carry no scopes at all
 * (and its OAuth has exactly one, `all`), so there is no permission a valid
 * connection could lack that would make this probe misreport a healthy app as
 * broken.
 *
 * ## Two honest limits on what this can report
 *
 *   1. **No reset time.** Flodesk documents no `X-Fd-RateLimit-Reset` and no
 *      `Retry-After`. The window is described as "per minute" in prose, which is
 *      not the same as knowing when the current one ends — so `resetAt` is left
 *      unset rather than computed from an assumption.
 *   2. **Header presence on a 200 is unverified.** This app was written without a
 *      live Flodesk key. Unauthenticated requests were confirmed to carry no
 *      `X-Fd-RateLimit-*` headers, which is expected (a 401 never reaches the
 *      metered handler) but is therefore not evidence either way about a 200.
 *      The hook consequently reports `unknown` with an explicit message when the
 *      headers are absent, instead of inventing the documented 100 as though it
 *      were a live reading.
 *
 * A 429 is read as a genuine, temporary `down` for this check, because in that
 * one case Flodesk has said outright that there is no headroom left. The
 * `informational` severity keeps that from dragging the app's verdict down.
 *
 * The batch endpoint's separate 20/minute bucket is deliberately NOT probed:
 * doing so would mean spending a request from a budget of twenty, and Flodesk
 * gives no way to read that bucket without a write.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { FlodeskClient, readRateLimit } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can show
 * why a workflow is about to start backing off.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Requests left in the current rate-limit window, read from the X-Fd-RateLimit-* headers on a GET /v1/segments/colors call. Flodesk allows 100 requests/minute by default.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await new FlodeskClient(ctx).send("/segments/colors");
    const reading = readRateLimit(res.headers);

    if (res.status === 429) {
      return {
        state: "down",
        message: "rate limited by Flodesk (HTTP 429); the default allowance is 100 requests/minute",
        quota: [{
          id: "default",
          limit: reading.limit ?? 100,
          remaining: 0,
          unit: "requests",
          // No reset header is published — see the note above.
        }],
        ttlSeconds: 60,
      };
    }

    if (!res.ok) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    if (reading.remaining === undefined) {
      return {
        state: "unknown",
        message: "response carried no `X-Fd-RateLimit-Remaining` header",
      };
    }

    return {
      state: headroom(reading.remaining, reading.limit),
      quota: [{
        id: "default",
        limit: reading.limit,
        remaining: reading.remaining,
        unit: "requests",
      }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
