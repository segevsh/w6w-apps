/**
 * How much headroom is left on THIS credential — lemlist.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed, and can they still pay for enrichment".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * ## One call, two buckets
 *
 * The RFC's rule is "declare a check per *call* you must make; report a
 * component per *thing* that call tells you about". `GET /team/credits` tells us
 * two independent things, so this is one request and two `quota` entries:
 *
 *  1. **`credits`** — enrichment credits, from the response BODY. A genuinely
 *     depleting resource: lemlist defines credits as "the coins a team uses to
 *     enrich emails, LinkedIn URLs, etc. via the enrich route", and the
 *     enrichment flags on Add Lead to Campaign spend them. Running out breaks
 *     enrichment while leaving the rest of the API working, which is exactly the
 *     kind of partial failure a quota check exists to surface.
 *  2. **`requests`** — rate-limit headroom, from the response HEADERS.
 *
 * `/team/credits` is also the right endpoint to probe: it needs no scope beyond
 * the key existing, and it is a single constant-size row.
 *
 * ## What is verified, and what is documented-but-unverified
 *
 * The **credits** bucket is verified against lemlist's published `Credits`
 * schema: `{ credits: integer, details: { remaining: { total, freemium,
 * subscription, gifted, paid } } }`. That is certain.
 *
 * The **requests** bucket relies on headers lemlist documents in the OpenAPI
 * `info.description` shipped with every endpoint page:
 *
 *   > "The rate limits are **20** requests per **2** seconds. The response
 *   > provides any information you may need about it: `Retry-After` — the number
 *   > of seconds in which you can retry; `X-RateLimit-Limit` — the maximum
 *   > requests in that time; `X-RateLimit-Remaining` — the number of remaining
 *   > requests you can make; `X-RateLimit-Reset` — the date when the rate limit
 *   > will reset."
 *
 * These were **not** confirmed on the wire — every lemlist route requires a key,
 * and this app was built without one. So the reading is defensive: if the
 * headers are absent the bucket reports `unknown` with a message saying so,
 * rather than pretending to a number. The credits bucket is unaffected either
 * way.
 *
 * ## `X-RateLimit-Reset` is a DATE, not a delta
 *
 * This is the one parsing trap, and lemlist's own example is unambiguous about
 * it: `"X-RateLimit-Reset": "Tue Feb 16 2021 09:02:42 GMT+0100 (Central
 * European Standard Time)"`. Most APIs (Brevo, Close) send seconds-from-now
 * there, so the reflex is to write `Date.now() + n * 1000` — which against
 * lemlist would produce a nonsense timestamp. `resetAt` therefore tries
 * `Date.parse` first and only falls back to numeric interpretations.
 *
 * ## The window is 2 seconds, which limits what "remaining" means
 *
 * A 20-per-2-seconds budget refills more than a hundred times a minute, so a low
 * `remaining` is a statement about this instant, not a trend. It is still worth
 * reporting — it is the signal that something is hammering the key right now —
 * but the bucket id and the `window` note say what it is, so nobody reads it as
 * a daily allowance.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null | undefined): number | undefined => {
  if (v === null || v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * lemlist documents `X-RateLimit-Reset` as an absolute date string, but the
 * numeric forms other APIs use are handled too.
 *
 * ## Order matters: a bare number is tested BEFORE `Date.parse`
 *
 * This looks like the wrong way round — the documented form is the date, so why
 * not try it first? Because `Date.parse` accepts bare numbers and produces
 * nonsense from them. In V8, `Date.parse("2")` succeeds, yielding **1 February
 * 2001**, and `Date.parse("5")` yields 1 May 2001. So a date-first parser would
 * silently convert a five-second reset into a timestamp 25 years in the past,
 * and no exception would ever be raised. A purely numeric string is never a date
 * string, so it is claimed first.
 *
 * Caught by `tests/health/quota.test.ts`, which asserts a small numeric value
 * lands within seconds of now.
 */
export function parseResetAt(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // A bare number: epoch seconds if it is large enough to be an instant,
  // otherwise seconds-from-now.
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return undefined;
    // Anything past ~2001 in epoch seconds is an instant, not "seconds from now".
    return n > 1_000_000_000
      ? new Date(n * 1000).toISOString()
      : new Date(Date.now() + n * 1000).toISOString();
  }

  const asDate = Date.parse(trimmed);
  return Number.isFinite(asDate) ? new Date(asDate).toISOString() : undefined;
}

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can show
 * why a workflow is about to start getting 429s or failing enrichment.
 */
export function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

/** The worst of several states wins the overall report. */
function worst(states: HealthState[]): HealthState {
  const rank: Record<HealthState, number> = { ok: 0, degraded: 1, unknown: 2, down: 3 };
  return states.reduce((a, b) => (rank[b] > rank[a] ? b : a), "ok" as HealthState);
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Enrichment credits and rate-limit headroom",
  description:
    "Reads GET /team/credits for the team's remaining enrichment credits, and the X-RateLimit-* headers on that same response for request headroom.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/team/credits`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      credits?: number;
      details?: { remaining?: Record<string, number> };
    } | null;

    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];
    const notes: string[] = [];

    // 1. Enrichment credits, from the body. No published ceiling exists — a team
    //    buys credits, it does not have a fixed allowance — so `limit` is left
    //    undefined rather than invented, and `headroom` degrades only at zero.
    const remainingCredits = body?.details?.remaining?.total ?? body?.credits;
    if (remainingCredits === undefined) {
      states.push("unknown");
      notes.push("credits missing from the /team/credits body");
    } else {
      buckets.push({
        id: "credits",
        remaining: remainingCredits,
        unit: "credits",
      });
      states.push(remainingCredits > 0 ? "ok" : "down");
    }

    // 2. Rate-limit headroom, from the headers on the same response.
    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      states.push("unknown");
      notes.push("response carried no X-RateLimit-* headers");
    } else {
      buckets.push({
        id: "requests",
        limit,
        remaining,
        resetAt: parseResetAt(res.headers.get("x-ratelimit-reset")),
        unit: "requests",
      });
      states.push(headroom(remaining, limit));
    }

    return {
      state: worst(states),
      message: notes.length ? notes.join("; ") : undefined,
      quota: buckets,
      ttlSeconds: 60,
    };
  },
};

export default quota;
