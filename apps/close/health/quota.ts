/**
 * How much rate-limit headroom is left on THIS credential — Close.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /me/`, the same scope-free call the auth `test` hook uses.
 *
 * ## This is a real probe, and it was verified on the wire
 *
 * Close documents a `RateLimit` header carrying three values — "`limit`: Request
 * limit enforced for this endpoint", "`remaining`: Requests left in the
 * enforcement window", "`reset`: Seconds remaining before this enforcement
 * window ends (as a decimal)" — and shows the format as:
 *
 *     RateLimit: limit=100, remaining=50, reset=5
 *
 * A live request to `https://api.close.com/api/v1/me/` on 2026-08-03 confirmed
 * the header is genuinely emitted:
 *
 *     ratelimit: limit=100; remaining=100; reset=1
 *     ratelimit-limit: 100
 *     ratelimit-remaining: 99
 *     ratelimit-reset: 1
 *
 * Two details that matter for parsing, both found by looking rather than
 * assuming:
 *
 *  1. **The live separator is `;`, the documented one is `,`.** The parser
 *     accepts either, because trusting the doc's comma alone would silently
 *     yield no readings against the real server.
 *  2. **Discrete `ratelimit-limit` / `-remaining` / `-reset` headers are also
 *     present**, and are used as a fallback when the combined header is absent
 *     or unparseable. The legacy `x-rate-limit-*` trio is explicitly described
 *     by Close as replaced, so it is not read.
 *
 * Close meters per endpoint GROUP, not globally — "GETs to /api/v1/lead/ and
 * POSTs/PUTs to /api/v1/activity/ may be counted as two different API groups" —
 * and the header reports "the limit it's closest to hitting". So this reading is
 * the headroom for the group `/me/` belongs to, not a single global budget. It
 * is still the right signal for "is this credential being throttled", but it
 * cannot promise that a write-heavy workflow has the same headroom. The
 * bucket id says so rather than implying a global number.
 *
 * There is a second, invisible ceiling: Close also enforces a per-Organization
 * limit roughly 3x the per-key one, shared across every key in the org. Nothing
 * in the response distinguishes which limit a reading refers to, so this check
 * does not pretend to.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null | undefined): number | undefined => {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Reset is SECONDS FROM NOW, and may be fractional. */
const isoFromDelta = (v: number | undefined): string | undefined =>
  v === undefined ? undefined : new Date(Date.now() + v * 1000).toISOString();

/**
 * Parse Close's combined `RateLimit` header.
 *
 * Accepts both the documented `limit=100, remaining=50, reset=5` and the
 * semicolon-separated form the live API actually returns. Unknown keys are
 * ignored rather than treated as an error, so a future addition cannot break
 * the reading.
 */
export function parseRateLimit(header: string | null): Record<string, number> {
  if (!header) return {};
  const out: Record<string, number> = {};
  for (const part of header.split(/[;,]/)) {
    const [rawKey, rawValue] = part.split("=");
    if (rawValue === undefined) continue;
    const key = rawKey.trim().toLowerCase();
    const value = Number(rawValue.trim());
    if (key && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can show
 * why a workflow is about to start getting 429s.
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
    "Requests left in the current enforcement window for the endpoint group `/me/` belongs to, " +
    "read off Close's `RateLimit` response header.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me/`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const combined = parseRateLimit(h.get("ratelimit"));

    // Fall back to the discrete headers when the combined one is missing or
    // unparseable — both are emitted today, and depending on only one of them
    // would make this check brittle for no benefit.
    const limit = combined.limit ?? num(h.get("ratelimit-limit"));
    const remaining = combined.remaining ?? num(h.get("ratelimit-remaining"));
    const reset = combined.reset ?? num(h.get("ratelimit-reset"));

    if (remaining === undefined) {
      return {
        state: "unknown",
        message: "response carried no readable RateLimit header",
      };
    }

    const bucket: HealthQuota = {
      // Named for what it actually measures: Close meters per endpoint group,
      // so this is not an organization-wide budget.
      id: "endpoint-group",
      limit,
      remaining,
      resetAt: isoFromDelta(reset),
      unit: "requests",
    };

    return { state: headroom(remaining, limit), quota: [bucket], ttlSeconds: 60 };
  },
};

export default quota;
