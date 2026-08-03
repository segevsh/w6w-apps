/**
 * How much rate-limit headroom is left on THIS credential — Fathom.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next call
 *     succeed or 429".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: Fathom meters per account, and reading the counters
 *     needs the credential on the wire.
 *   - No `network.allow` of its own — `api.fathom.ai` is already on the app's
 *     egress allowlist, which is what makes signing this probe safe. The spec
 *     forbids widening egress alongside a signed posture.
 *   - `severity: "informational"` — being near the limit is worth showing and
 *     never worth failing a verdict over; a 429 is a wait, not an outage.
 *
 * Probe: `GET /meetings` with no `include_*` flags. Fathom publishes no quota or
 * usage endpoint, so the reading has to be lifted off the response headers of a
 * real call, and this is the cheapest call every key can make (`/users` is
 * account-admin-only and 403s for an ordinary member; the recording endpoints
 * are metered on the stricter "heavy" bucket). Without an include flag this
 * request stays on the global 60-per-60s bucket — which is the bucket the
 * headers then describe.
 *
 * Headers, verbatim from Fathom's rate-limiting docs:
 *
 *   - `RateLimit-Limit`     — maximum requests allowed in the window
 *   - `RateLimit-Remaining` — requests left in the current window
 *   - `RateLimit-Reset`     — **time remaining** in the current window
 *   - `Retry-After`         — seconds to wait, sent only on a 429
 *
 * `RateLimit-Reset` is read as seconds-remaining (the docs' own wording, and the
 * IETF RateLimit-header semantics) and turned into an absolute `resetAt`.
 *
 * **Honest caveat**: the docs hedge with "endpoints subject to rate limits *may*
 * return the headers below", and this was written without a live Fathom key, so
 * their presence on `/meetings` specifically is unverified. The hook therefore
 * reports `unknown` with an explicit message when the headers are absent rather
 * than inventing a number — and a 429 is read as a genuine, temporary `down`
 * because in that case Fathom has said outright that there is no headroom left.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { FathomClient, readRateLimit } from "../lib/client.ts";

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
    "Requests left in the current global rate-limit window, read from the RateLimit-* headers on a GET /meetings call.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await new FathomClient(ctx).send("/meetings");
    const reading = readRateLimit(res.headers);

    if (res.status === 429) {
      const retry = reading.retryAfterSeconds;
      return {
        state: "down",
        message: retry === undefined
          ? "rate limited by Fathom (HTTP 429)"
          : `rate limited by Fathom (HTTP 429); retry after ${retry}s`,
        quota: [{
          id: "global",
          limit: reading.limit,
          remaining: 0,
          unit: "requests",
          resetAt: retry === undefined
            ? undefined
            : new Date(Date.now() + retry * 1000).toISOString(),
        }],
        ttlSeconds: 60,
      };
    }

    if (!res.ok) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }
    if (reading.remaining === undefined) {
      return { state: "unknown", message: "response carried no `RateLimit-Remaining` header" };
    }

    return {
      state: headroom(reading.remaining, reading.limit),
      quota: [{
        id: "global",
        limit: reading.limit,
        remaining: reading.remaining,
        unit: "requests",
        resetAt: reading.resetSeconds === undefined
          ? undefined
          : new Date(Date.now() + reading.resetSeconds * 1000).toISOString(),
      }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
