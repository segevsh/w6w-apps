/**
 * How much headroom is left on THIS credential — Quickbase.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:user-token` check answers "is the credential live"; this answers
 *     "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: Quickbase meters **per user token**, so the
 *     allowance belongs to the credential, and reading it needs the credential
 *     on the wire.
 *   - This check declares no `network.allow` of its own — the spec forbids
 *     widening egress from a signed posture, and it needs no widening: the
 *     probe stays on the app's own allowlist (`api.quickbase.com` /
 *     `api.quickbase.eu`).
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * ## The documented limit
 *
 * Quickbase's developer portal (Rate Limit page, read 2026-08-03) states it
 * plainly: "Most Quickbase API calls allow for **100 API calls per 10 seconds
 * per user token**", and on a 429 the response carries `retry-after`, which may
 * be either delay-seconds or an HTTP-date.
 *
 * ## Why this is a live probe and not an `unavailable` declaration
 *
 * The prose above documents only `retry-after`, which is the *rejection* signal
 * — reading it requires making the call that gets rejected, which is no basis
 * for a check. On that alone this would be declared unavailable, as it is for
 * Airtable.
 *
 * But Quickbase does emit headroom, and it says so itself. Every response from
 * `api.quickbase.com` carries (verified on the wire, 2026-08-03):
 *
 *     access-control-expose-headers: qb-api-ray,x-ratelimit-remaining,
 *       x-ratelimit-limit,x-ratelimit-reset,content-disposition,retry-after
 *
 * A server only lists a header in `Access-Control-Expose-Headers` in order to
 * make that header readable to a browser client — it is Quickbase declaring
 * which of its own response headers exist and are meant to be read. So
 * `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset` are the
 * documented-by-the-server headroom signals, and this check reads them.
 *
 * **The honest limit of that evidence:** the CORS declaration was observed, but
 * the three headers were NOT observed populated on a live response, because
 * every response reachable without a real user token is a 4xx that omits them.
 * Confirming they are present on a 200 needs a genuine Quickbase credential,
 * which this build did not have. The check is therefore written to degrade
 * rather than to assume: if the headers are absent it reports `unknown` with a
 * message saying so, exactly as it would if Quickbase removed them tomorrow. It
 * never fabricates a number, and because it is `informational` an `unknown`
 * here cannot drag a roll-up down.
 *
 * ## The probe
 *
 * `GET /apps/{appId}` — the same single-app read the auth `test` hook uses. It
 * is the cheapest call the credential is guaranteed to be entitled to: a user
 * token is assigned to applications, so if it can do anything at all it can
 * read the app it is assigned to. A record query would cost real work on the
 * vendor's side and needs a table id this check has no way to choose;
 * `POST /users` is an account-level directory read a per-app token is usually
 * not entitled to, so it would report `unknown` for most connections.
 *
 * ## `x-ratelimit-reset`, and the one number this check refuses to guess
 *
 * The unit is undocumented and genuinely ambiguous, so {@link resetAt} reports
 * a reset instant only when the value is unambiguous, and reports nothing when
 * it is not. The ambiguity is not hypothetical:
 *
 *   - Quickbase documents no unit for `x-ratelimit-reset` anywhere — the header
 *     is not even listed on the portal's Headers page; its existence is known
 *     only from the CORS declaration above.
 *   - The maintained community SDK `tflanagan/node-quickbase` treats it as
 *     **milliseconds**: it backs off with `+(headers['x-ratelimit-reset'] ||
 *     10000)` used directly as a `setTimeout` delay.
 *   - The sibling `retry-after` header, which Quickbase *does* document, is
 *     specified as delay-**seconds** or an HTTP-date.
 *
 * The rate-limit window is 10 seconds, so a within-window remainder is a small
 * number under either reading — and "10000" is either 10 seconds or 2.8 hours
 * depending on which is right. A 1000x error in an operator-facing timestamp is
 * worse than a blank field, so a small value yields `undefined`. Values large
 * enough to only be an absolute epoch, and parseable date strings, are
 * unambiguous and ARE reported. `limit` and `remaining` are unaffected: they are
 * plain counts with nothing to misread.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { apiBase, realmFromConnection } from "../lib/client.ts";
import type { QuickbaseDisplay } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Below this, a number cannot be an epoch in seconds (1e9 is September 2001). */
const EPOCH_SECONDS_FLOOR = 1_000_000_000;
/** Above this, a number is too large to be an epoch in seconds, so it is milliseconds. */
const EPOCH_MILLIS_FLOOR = 100_000_000_000;

/**
 * Turn `x-ratelimit-reset` into an ISO instant, or nothing.
 *
 * Only unambiguous values are converted (see the note above for why):
 *   - a number large enough to only be an absolute epoch — in seconds, or in
 *     milliseconds when larger still;
 *   - a parseable date string, per `retry-after`'s http-date alternative.
 *
 * Anything smaller is a within-window remainder whose unit Quickbase has never
 * stated, and is deliberately dropped rather than guessed. An unparseable value
 * is dropped too: no timestamp is better than a confidently wrong one.
 */
export function resetAt(raw: string | null): string | undefined {
  if (raw === null || raw.trim() === "") return undefined;

  const n = num(raw);
  if (n !== undefined) {
    if (n < EPOCH_SECONDS_FLOOR) return undefined; // ambiguous unit — see above
    const ms = n < EPOCH_MILLIS_FLOOR ? n * 1000 : n;
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
 */
export function headroom(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Per-user-token allowance remaining, read off the `x-ratelimit-*` response headers. Quickbase documents 100 calls per 10 seconds per token.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential. The
    // token and realm reach the wire only via `sign`.
    const display = (ctx.connection?.display ?? {}) as QuickbaseDisplay;
    if (!display.appId) {
      return { state: "unknown", message: "connection records no application id" };
    }

    const base = apiBase(realmFromConnection(ctx.connection));
    const res = await ctx.fetch(`${base}/apps/${encodeURIComponent(display.appId)}`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "user-token",
        limit,
        remaining,
        resetAt: resetAt(h.get("x-ratelimit-reset")),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
