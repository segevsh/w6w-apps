/**
 * How much headroom is left on THIS credential — Jobber.
 *
 * Jobber does not meter in `X-RateLimit-*` headers. Its real budget is **query
 * cost**, and it publishes the reading in the response body: every response
 * carries `extensions.cost`, with `throttleStatus.maximumAvailable`,
 * `currentlyAvailable` and `restoreRate`. That object IS the honest quota
 * signal, so this probe reads it rather than inventing a header Jobber does not
 * send.
 *
 * The budget is a **leaky bucket** scoped to an app/account pair — 10,000
 * points at rest, refilling at 500 points per second — so it is genuinely
 * per-Connection, and a query costing more than `currentlyAvailable` comes back
 * as `errors[{ extensions: { code: "THROTTLED" } }]` at HTTP 200.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next batch
 *     of calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the app/account pair, and
 *     reading it needs the credential on the wire. Signing is safe because the
 *     probe stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over. It is also the honest severity for a second
 *     reason: an account that has just made a large legitimate query is
 *     *supposed* to be near zero, and the bucket refills at 500/s, so a low
 *     reading is frequently a normal reading a second old.
 *
 * ## What is NOT reported, and why
 *
 * Jobber runs a *second* limiter: Rack::Attack DDoS protection at 2500 requests
 * per 5 minutes per app/account, answering HTTP 429. Nothing in a response
 * exposes how much of that bucket is spent — no header, no `extensions` key —
 * so it is not reported. Inventing a second bucket from the documented ceiling
 * would be a guess dressed as a measurement. Jobber's own note is that this
 * limiter "is typically less restrictive than the GraphQL Query Cost", so the
 * bucket that IS readable is also the one that usually binds.
 *
 * ## Provenance
 *
 * The shape of `extensions.cost` is transcribed from Jobber's API Rate Limits
 * page, which prints it twice with worked values. It could not be confirmed on
 * the wire while building this app: an **unauthenticated** request to the live
 * endpoint returns no `extensions` block at all (checked 2026-08-03), and no
 * Jobber credential was available. The probe is written so that a missing or
 * malformed cost block reports `unknown` with a message that says so, rather
 * than fabricating a bucket.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL, API_VERSION, API_VERSION_HEADER, type JobberExtensions } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start collecting `THROTTLED` errors.
 *
 * `down` only at a literally empty bucket, where the very next query is
 * certain to be throttled. Below a tenth of the ceiling is `degraded`: at
 * 500 points/second of refill that is still under two seconds from full, but it
 * is the point at which a 100-row page (up to 500 points) stops fitting.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit && remaining < limit * 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "GraphQL query-cost headroom",
  description:
    "Points remaining in Jobber's leaky-bucket query-cost budget for this app/account pair, read off `extensions.cost.throttleStatus`. The separate 2500-requests-per-5-minutes DDoS limit is not readable and is not reported.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `{ account { id } }` — one field, one point. The cheapest authenticated
    // question Jobber answers, and the reading is on the envelope of any query,
    // so the probe does not need to ask for anything it cares about.
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        [API_VERSION_HEADER]: API_VERSION,
      },
      body: JSON.stringify({ query: "{ account { id } }" }),
    });

    const body = await res.json().catch(() => ({})) as {
      errors?: Array<{ message?: string; extensions?: { code?: string } }>;
      extensions?: JobberExtensions;
    };

    // A throttled probe still carries the cost block, and that reading is the
    // most useful one this check can return — so read it before bailing out.
    const throttle = body.extensions?.cost?.throttleStatus;

    if (body.errors?.length && !throttle) {
      return {
        state: "unknown",
        message: body.errors[0]?.message ?? "quota probe was rejected",
      };
    }
    if (!res.ok && !throttle) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    if (!throttle || typeof throttle.currentlyAvailable !== "number") {
      return { state: "unknown", message: "response carried no extensions.cost.throttleStatus" };
    }

    const limit = typeof throttle.maximumAvailable === "number"
      ? throttle.maximumAvailable
      : undefined;
    const remaining = throttle.currentlyAvailable;

    // A leaky bucket has no reset instant, so `resetAt` is the moment the
    // bucket is projected to be full again at the advertised restore rate —
    // the closest true statement to "when will this be topped up".
    let resetAt: string | undefined;
    const rate = throttle.restoreRate;
    if (typeof rate === "number" && rate > 0 && limit !== undefined && remaining < limit) {
      resetAt = new Date(Date.now() + Math.ceil((limit - remaining) / rate) * 1000).toISOString();
    }

    const bucket: HealthQuota = {
      id: "query-cost",
      limit,
      remaining,
      resetAt,
      unit: "points",
    };

    return {
      state: headroom(remaining, limit),
      message: body.errors?.length ? "Jobber throttled the probe itself" : undefined,
      quota: [bucket],
      ttlSeconds: 60,
    };
  },
};

export default quota;
