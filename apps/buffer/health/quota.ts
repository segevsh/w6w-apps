import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";
import { IDENTITY_PROBE_QUERY } from "../lib/identity.ts";

/**
 * How much rate-limit headroom is left on THIS credential.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:api-key` / `auth:oauth2` checks answer "is the credential live";
 *     this answers "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: Buffer meters *per client*, so the allowance
 *     belongs to the credential, and reading it needs the credential on the
 *     wire.
 *   - **No `network.allow` of its own** — the spec forbids widening egress
 *     alongside a signed posture, and none is needed: the probe stays on
 *     `api.buffer.com`, already the app's only allowlisted host.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over. A tenant at 12% headroom is working fine.
 *
 * ## Three windows, not one
 *
 * This is the unusual part. Buffer does not have *a* rate limit; it has three
 * concurrent ones, and which one bites depends entirely on usage shape:
 *
 *   | Window  | Free  | Essentials | Team   |
 *   | ------- | ----- | ---------- | ------ |
 *   | 15 min  | 100   | 100        | 100    |
 *   | 24 h    | 250   | 250        | 500    |
 *   | 30 days | 3,000 | 7,500      | 15,000 |
 *
 * A burst exhausts the 15-minute window; a steady trickle exhausts the 30-day
 * one, and 3,000 a month is about four an hour. So the verdict is the **worst**
 * of the three, and all three are reported individually as `quota[]` rows.
 * Reporting only one would hide whichever is actually about to fail.
 *
 * ## The headers, and exactly how far they were verified
 *
 * Buffer publishes structured-field rate-limit headers on every response:
 *
 * ```
 * RateLimit: "200-in-15min";r=198;t=897
 * RateLimit: "1000-in-1day";r=998;t=86397
 * RateLimit: "30000-in-30days";r=29969;t=696980
 * RateLimit-Policy: "200-in-15min";q=200;w=900;pk=:ZjJjZjVmNzM5M2Zm:
 * ```
 *
 * `RateLimit-Policy` gives the ceiling: `q` quota, `w` window in seconds, `pk`
 * the partition key. `RateLimit` gives the live state: `r` remaining, `t`
 * seconds until that window resets. Repeated headers, one per policy.
 *
 * **Stated plainly: the headers were NOT observed on the wire.** Verifying them
 * needs a working Buffer credential, and this app was built without a Buffer
 * account. What *was* checked, 2026-08-03, is the negative case: `POST
 * https://api.buffer.com` with `Authorization: Bearer bogus` returns `401` with
 * `date`, `content-type`, `content-length`, `cf-ray`, `etag`, `set-cookie`,
 * `strict-transport-security`, `vary` and the usual Cloudflare/security headers
 * — and **no `RateLimit`, `RateLimit-Policy` or `Retry-After` among them**.
 * That is consistent with rejection happening at the auth layer before the
 * limiter runs, and therefore neither confirms nor refutes the documented
 * behaviour on an authenticated call.
 *
 * The parser is built for that uncertainty rather than around it: absent or
 * unparseable headers yield `state: "unknown"` with a message naming what was
 * missing, never a fabricated reading and never a false `ok`.
 *
 * ## Matching a policy by window, not by name
 *
 * Buffer is explicit, and following it is what keeps this check working across
 * a plan change: *"Policy names like `200-in-15min` are generated from your
 * quota and window, so they change with your plan. Match a policy by its window
 * length (`w`) — 900 (15 minutes), 86400 (24 hours), or 2592000 (30 days) —
 * rather than by name."* So `WINDOWS` below is keyed on seconds, and a policy
 * whose window is none of the three is still reported (labelled by its raw `w`)
 * rather than dropped — a fourth window appearing is news, not noise.
 *
 * Names are still used for one thing: joining a `RateLimit` line to its
 * `RateLimit-Policy` line, since the quoted name is the only key the two share.
 *
 * ## Probing costs a request against the thing being measured
 *
 * Unavoidable, and Buffer's own advice is the mitigation: *"The headers come
 * back on every GraphQL response, so you can read them off requests you already
 * make."* A host that wants zero-cost quota reporting should read them off
 * action responses; this check exists for the case where no action has run
 * recently. `minIntervalSeconds: 60` keeps it from being the thing that
 * exhausts the budget — at most 15 of the 15-minute window's 100.
 *
 * The probe is `{ account { id } }`, the same single-scalar query the auth
 * `test` hooks use, chosen by reading what it returns rather than by its name.
 * See `auth/api-key.ts`.
 *
 * ## A 429 is a reading, not an error
 *
 * Handled before the generic failure branch. Buffer returns HTTP 429 with
 * `extensions.code: "RATE_LIMIT_EXCEEDED"` and `extensions.window` naming which
 * of `15m` / `24h` / `30d` was exhausted, plus a `Retry-After` header in
 * seconds — *"the retry hint is in the header, not the body"*. All three are
 * surfaced, because "you are being throttled" is precisely what this check
 * exists to report.
 */

/** Fraction of the allowance below which headroom is worth flagging. */
const DEGRADED_BELOW = 0.15;

/** Fraction of the allowance at which throttling is effectively happening. */
const DOWN_BELOW = 0.02;

/** Documented window lengths in seconds → the label Buffer uses for them. */
export const WINDOWS: Record<number, string> = {
  900: "15m",
  86400: "24h",
  2592000: "30d",
};

export interface RateLimitPolicy {
  name: string;
  /** Quota (`q`) — the ceiling. From `RateLimit-Policy`. */
  limit?: number;
  /** Window length in seconds (`w`). From `RateLimit-Policy`. */
  window?: number;
  /** Remaining (`r`). From `RateLimit`. */
  remaining?: number;
  /** Seconds until this window resets (`t`). From `RateLimit`. */
  resetSeconds?: number;
}

/**
 * Split a repeated structured-field header into its member strings.
 *
 * `fetch` joins repeated headers with `", "`, and each member starts with a
 * quoted policy name — so the split is on a comma followed by a quote, which is
 * the same regex Buffer's own JavaScript example uses
 * (`.split(/,\s*(?=")/)`). Splitting on a bare comma would break `pk` values
 * and any future parameter containing one.
 */
export function splitMembers(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/,\s*(?=")/).map((s) => s.trim()).filter(Boolean);
}

/** Parse one member: `"200-in-15min";r=198;t=897` → name plus numeric params. */
export function parseMember(
  member: string,
): { name: string; params: Record<string, number> } | undefined {
  const nameMatch = member.match(/^"([^"]+)"/);
  if (!nameMatch) return undefined;
  const params: Record<string, number> = {};
  for (const part of member.slice(nameMatch[0].length).split(";")) {
    const kv = part.trim().match(/^([a-z]+)=(\d+)$/i);
    // `pk=:ZjJjZjVmNzM5M2Zm:` is a byte-sequence, not a number — skipped on
    // purpose. It identifies the bucket and says nothing about headroom.
    if (kv) params[kv[1].toLowerCase()] = Number(kv[2]);
  }
  return { name: nameMatch[1], params };
}

/**
 * Join `RateLimit` and `RateLimit-Policy` into one row per policy.
 *
 * Keyed by the quoted name because that is the only field the two headers
 * share; the *window* is what everything downstream matches on, per Buffer's
 * instruction that names change with the plan.
 */
export function parseRateLimitHeaders(
  rateLimit: string | null | undefined,
  policy: string | null | undefined,
): RateLimitPolicy[] {
  const byName = new Map<string, RateLimitPolicy>();

  for (const member of splitMembers(policy)) {
    const parsed = parseMember(member);
    if (!parsed) continue;
    byName.set(parsed.name, {
      name: parsed.name,
      limit: parsed.params.q,
      window: parsed.params.w,
    });
  }

  for (const member of splitMembers(rateLimit)) {
    const parsed = parseMember(member);
    if (!parsed) continue;
    const row = byName.get(parsed.name) ?? { name: parsed.name };
    row.remaining = parsed.params.r;
    row.resetSeconds = parsed.params.t;
    byName.set(parsed.name, row);
  }

  // A policy with no live reading is not useful — it states a ceiling and no
  // consumption — so only rows carrying `remaining` survive.
  return [...byName.values()].filter((r) => r.remaining !== undefined);
}

/** Map remaining/limit onto a state. Exported so the thresholds are testable. */
export function quotaState(remaining: number, limit: number): HealthState {
  if (limit <= 0) return "unknown";
  const fraction = remaining / limit;
  if (fraction <= DOWN_BELOW) return "down";
  if (fraction < DEGRADED_BELOW) return "degraded";
  return "ok";
}

/** `900` → `"15m"`, and an undocumented window → `"3600s"` rather than dropped. */
export function windowLabel(window: number | undefined): string {
  if (window === undefined) return "unknown window";
  return WINDOWS[window] ?? `${window}s`;
}

function parseIntHeader(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Reads Buffer's structured `RateLimit` / `RateLimit-Policy` headers via a single " +
    "`{ account { id } }` query. Buffer meters three concurrent windows — 15 minutes, 24 hours " +
    "and 30 days — so all three are reported and the verdict is the worst of them.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: IDENTITY_PROBE_QUERY }),
    });

    const policies = parseRateLimitHeaders(
      res.headers.get("ratelimit"),
      res.headers.get("ratelimit-policy"),
    );

    // A 429 is a positive reading in its own right: an allowance is gone, and
    // `Retry-After` says for how long. Handled before the generic failure
    // branch, because "you are being throttled" is what this check is for —
    // not an error that prevented it reporting.
    if (res.status === 429) {
      const retryAfter = parseIntHeader(res.headers.get("retry-after"));
      const window = await exhaustedWindow(res);
      return {
        state: "down",
        message: `rate limited${window ? ` on the \`${window}\` window` : ""}${
          retryAfter !== undefined ? `; retry after ${retryAfter}s` : ""
        }`,
        quota: policies.length > 0 ? toQuotaRows(policies) : [{
          id: window,
          remaining: 0,
          unit: "requests",
        }],
      };
    }

    if (!res.ok && policies.length === 0) {
      // `unknown`, not `down`: a probe that could not run says nothing about
      // the allowance. A 401 here is a credential story, and the derived
      // `auth:*` checks are the ones that report it.
      return { state: "unknown", message: `Buffer returned HTTP ${res.status}` };
    }

    if (policies.length === 0) {
      return {
        state: "unknown",
        message: "response carried no readable `RateLimit` / `RateLimit-Policy` headers — the " +
          "documented headers were absent or unparseable",
      };
    }

    const rows = toQuotaRows(policies);
    const states = policies.map((p) =>
      p.limit !== undefined && p.remaining !== undefined
        ? quotaState(p.remaining, p.limit)
        : "unknown"
    );

    const summary = policies
      .map((p) => `${p.remaining ?? "?"}/${p.limit ?? "?"} in ${windowLabel(p.window)}`)
      .join(", ");

    return {
      state: worstHealthState(states),
      message: summary,
      quota: rows,
      ttlSeconds: 30,
    };
  },
};

function toQuotaRows(policies: RateLimitPolicy[]): HealthQuota[] {
  return policies.map((p) => ({
    id: windowLabel(p.window),
    limit: p.limit,
    remaining: p.remaining,
    unit: "requests",
    // `t` is "the seconds until that window resets" — an explicit reset
    // instant, so an ISO timestamp here is a real fact rather than a
    // synthesised one. (Contrast the sibling `followupboss` app, whose sliding
    // window has no reset event and therefore no `resetAt`.)
    ...(p.resetSeconds !== undefined
      ? { resetAt: new Date(Date.now() + p.resetSeconds * 1000).toISOString() }
      : {}),
  }));
}

/** Read `extensions.window` off a 429 body: `15m`, `24h` or `30d`. */
async function exhaustedWindow(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json() as {
      errors?: Array<{ extensions?: { window?: string } }>;
    };
    return body?.errors?.[0]?.extensions?.window;
  } catch {
    return undefined;
  }
}

export default quota;
