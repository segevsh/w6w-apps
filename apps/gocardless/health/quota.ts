import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/access-token.ts";

/**
 * How much of this Connection's request allowance is left?
 *
 * ## Why this is a live check and not a declared absence
 *
 * GoCardless documents (Limits & Safeguards) that **every** response carries its
 * rate-limit state:
 *
 * ```
 * ratelimit-limit: 1000
 * ratelimit-remaining: 163
 * ratelimit-reset: Thu, 03 May 2018 16:00:00 GMT
 * ```
 *
 * 1,000 requests per minute is the standard allowance, and going past it answers
 * `429 rate_limit_exceeded`. Nothing has to be guessed or computed: the headers
 * are on the wire, so this check reads them off a normal API call. The header
 * names are lower-case everywhere below, which is how `Headers.get` normalises
 * them — the vendor's own spelling is `ratelimit-*`.
 *
 * ## The probe is the credential probe
 *
 * `GET /creditors?limit=1` — the same read `auth/access-token.ts` makes. The
 * allowance is per access token rather than per endpoint, so any authenticated
 * call reports the same headroom, and this is the cheapest one that needs no
 * elevated permission. Two checks, one read, no extra load.
 *
 * No `network.allow` is declared: the check is `credential: "signed"`, so the
 * host routes it through `sign` exactly like an Action, and `sign` is what
 * rewrites the host to the Connection's chosen environment. The URL built here
 * therefore starts at the live origin and lands on the right host either way.
 *
 * ## Annotation
 *
 * `severity: "informational"` — running low is context, never a verdict, and
 * that matters twice over here:
 *
 *  - a `429` is not a broken Connection, so exhausting the allowance must not
 *    degrade (let alone fail) the App's roll-up;
 *  - the defensive `unknown` below would otherwise pin the App at `unknown`
 *    forever if GoCardless ever stopped sending the headers — the same trap
 *    `HEALTHCHECKS.md` names for declared absences.
 *
 * The state is still reported honestly (`degraded` at zero remaining), so a UI
 * can show why a workflow is about to start getting 429s.
 */
export const PROBE_URL = `${API_BASE}${PROBE_PATH}`;

/** `ratelimit-reset` is an HTTP-date, e.g. `Thu, 03 May 2018 16:00:00 GMT`. */
export function parseHttpDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/** A header the vendor sends as a decimal integer. */
export function readNumber(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * No headroom left is `degraded`, anything else is `ok`.
 *
 * Deliberately not `down`: an exhausted allowance resolves itself when the
 * window rolls over, and marking it `down` would report GoCardless as broken
 * when the account is merely throttled.
 */
export function headroomState(remaining: number | undefined): HealthState {
  if (remaining === undefined) return "unknown";
  return remaining <= 0 ? "degraded" : "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request-rate headroom",
  description:
    "Requests remaining in this connection's allowance, read off the `ratelimit-limit`, " +
    "`ratelimit-remaining` and `ratelimit-reset` headers GoCardless puts on every response.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });

    // Read before the status is considered: GoCardless sends these on error
    // responses too, and a 401 that still reports 998/1000 remaining is the
    // honest reading of "this credential's allowance".
    const limit = readNumber(res.headers.get("ratelimit-limit"));
    const remaining = readNumber(res.headers.get("ratelimit-remaining"));

    if (remaining === undefined) {
      await res.body?.cancel();
      return {
        state: "unknown",
        message: res.ok
          ? "GoCardless answered without the documented `ratelimit-*` headers, so headroom " +
            "cannot be read from this response."
          : `The quota probe answered ${res.status} and carried no \`ratelimit-*\` headers, so ` +
            "headroom could not be read.",
      };
    }

    return {
      state: headroomState(remaining),
      quota: [
        {
          id: "requests",
          limit,
          remaining,
          resetAt: parseHttpDate(res.headers.get("ratelimit-reset")),
          unit: "requests",
        },
      ],
      ttlSeconds: 60,
    };
  },
};

export default quota;
