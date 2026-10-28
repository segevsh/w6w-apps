/**
 * How much is left — and here, unusually, both meanings are answerable.
 *
 * Most apps in this pack can report at most one of the two. Dropbox Sign
 * publishes both, from a single authenticated `GET /account`:
 *
 *   - **Plan quota, in the body.** `account.quotas` carries
 *     `api_signature_requests_left`, `documents_left`, `templates_left` and
 *     `sms_verifications_left`. This is the number that actually stops a
 *     workflow: run out and a send fails no matter how slowly you call.
 *   - **Request rate, in the headers.** Measured 2026-08-18 the wire carries
 *     `x-ratelimit-limit`, `x-ratelimit-limit-remaining` and
 *     `x-ratelimit-reset` — the middle one is **not** the
 *     `X-RateLimit-Remaining` the spec declares, which is why `readRateLimit`
 *     reads both spellings.
 *
 * Two measured facts shape the rest:
 *
 *   - The headers are **absent on a 401**: an unauthenticated `GET /v3/account`
 *     carries none of them, while a `404` from the same host carries all three.
 *     They are emitted past the auth tier, so only a signed call can read them —
 *     which is why this check is `credential: "signed"` rather than a ping.
 *   - `quotas` fields are **nullable**. An unlimited plan reports `null` rather
 *     than a large number, and reading that as zero would report a healthy
 *     enterprise account as exhausted. Null is treated as "no ceiling".
 *
 * `severity: "informational"` because low headroom is a billing fact, not an
 * outage: a connection with three signature requests left is working perfectly.
 * It also keeps the `unknown` this returns on an unusable credential from
 * pinning the App's verdict — the derived `auth:*` checks answer that question.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_URL, readRateLimit } from "../lib/client.ts";

/** Below this, say so before a workflow finds out mid-run. */
const LOW_WATER = 10;

interface Quotas {
  api_signature_requests_left?: number | null;
  documents_left?: number | null;
  templates_left?: number | null;
  sms_verifications_left?: number | null;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan quota and request rate",
  description:
    "Signature requests, documents and templates left on the plan, read from GET /account, " +
    "plus the hourly request allowance from the same response's headers.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account`, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `GET /account returned ${res.status}` };
    }

    const rate = readRateLimit(res.headers);
    const body = await res.json().catch(() => null) as { account?: { quotas?: Quotas } } | null;
    const quotas = (body?.account?.quotas ?? {}) as Record<string, number | null | undefined>;

    // A null means "no ceiling on this plan", not zero — so only numbers count.
    const counted = Object.entries(quotas)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number");

    const reported: HealthQuota[] = counted.map(([id, remaining]) => ({
      id,
      remaining,
      unit: id.includes("request") ? "requests" : "documents",
    }));
    if (rate.limit !== undefined || rate.remaining !== undefined) {
      reported.push({
        id: "requests-per-hour",
        limit: rate.limit,
        remaining: rate.remaining,
        unit: "requests",
        resetAt: rate.reset === undefined ? undefined : new Date(rate.reset * 1000).toISOString(),
      });
    }

    const parts = counted.map(([k, v]) => `${k.replace(/_left$/, "")}: ${v}`);
    if (rate.remaining !== undefined && rate.limit !== undefined) {
      parts.push(`requests this hour: ${rate.remaining}/${rate.limit}`);
    }
    const message = parts.length ? parts.join(", ") : "this plan reports no metered quota";

    if (counted.some(([, v]) => v <= 0)) {
      return { state: "down", message: `exhausted — ${message}`, quota: reported };
    }
    if (
      counted.some(([, v]) => v < LOW_WATER) ||
      (rate.remaining !== undefined && rate.remaining < LOW_WATER)
    ) {
      return { state: "degraded", message: `running low — ${message}`, quota: reported };
    }
    return { state: "ok", message, quota: reported, ttlSeconds: 300 };
  },
};

export default quota;
