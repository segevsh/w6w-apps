/**
 * API rate-limit headroom — `X-RateLimit-*` response headers.
 *
 * Unlike Chargebee (this pack's other subscription-billing app, which
 * publishes ceilings but no headroom counter), Recurly's own "Limits" section
 * documents real runtime headers on every response: *"The rate limit applied
 * to your client can be determined with the `X-RateLimit-Limit` header, and
 * the number of remaining requests is sent in the `X-RateLimit-Remaining`
 * header. Finally, the `X-RateLimit-Reset` header contains ... the time ...
 * at which the request count will be reset."*
 *
 * Two things worth knowing about what those numbers mean:
 *
 *  - **Sandbox sites count every method** (400 req/min); **production sites
 *    count only GET** (1,000 req/min) — the docs are explicit that write
 *    methods stop counting once a site leaves sandbox mode. A `remaining`
 *    reading on a production site is therefore silent about how much POST/PUT
 *    headroom is left, because there is no ceiling on those at all.
 *  - The window is a **sliding 5 minutes**, not a fixed per-minute bucket —
 *    the docs' own example: "a production site could make 4,000 requests
 *    within one minute and not hit the rate limit so long as the site made
 *    less than 1,000 requests during the prior 4 minutes."
 *
 * No credential exists to confirm the headers are actually present on a live
 * response (none was available while building this app), so a response
 * carrying neither header reports `unknown` rather than assuming they are
 * missing entirely — the safer read given the vendor's own docs describe them
 * as unconditional.
 *
 * `credential: "signed"` (this kind's default) — the probe reuses the
 * connection's own cheapest read, `GET /sites?limit=1`, rather than adding a
 * second liveness check under a quota label.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import {
  ACCEPT_HEADER,
  hostFor,
  rateLimitFromHeaders,
  type RecurlyConnectionDisplay,
} from "../lib/client.ts";

/** Below this remaining fraction, flag it before the next call gets a 429. */
const LOW_HEADROOM_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as RecurlyConnectionDisplay;
    const host = hostFor(display);

    const res = await ctx.fetch(`https://${host}/sites?limit=1`, {
      headers: { accept: ACCEPT_HEADER },
    });

    // A rejected credential is the `auth:api-key` check's job to report; this
    // check has nothing to say about quota when the call never got that far.
    if (res.status === 401 || res.status === 403) {
      return {
        state: "unknown",
        message: `Recurly returned ${res.status} before headers could be read`,
      };
    }

    const { limit, remaining, resetAt } = rateLimitFromHeaders(res.headers);
    if (limit === undefined && remaining === undefined) {
      return {
        state: "unknown",
        message: "Recurly did not return X-RateLimit-* headers on this response",
      };
    }

    const low = limit !== undefined && limit > 0 && remaining !== undefined &&
      remaining / limit < LOW_HEADROOM_FRACTION;

    return {
      state: low ? "degraded" : "ok",
      quota: [{ limit, remaining, resetAt, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
