/**
 * How much headroom is left on THIS credential — Linear.
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
 * Probe: the `{ viewer { id } }` query the auth `test` hook already uses — the
 * cheapest thing a GraphQL API can be asked.
 *
 * Linear meters two things independently: request count, and query COMPLEXITY.
 * A workflow that pulls deep issue trees exhausts complexity long before it
 * runs out of requests, so reporting only the request bucket would be
 * misleading. Both are reported when present.
 *
 * This is Linear's only automatable signal beyond credential liveness —
 * status.linear.app is a human page, which is why `service` is `unavailable`.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Linear's reset headers are epoch MILLISECONDS. */
const isoFromEpochMs = (v: string | null): string | undefined => {
  const n = num(v);
  return n === undefined ? undefined : new Date(n).toISOString();
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
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
    "Request and query-complexity allowances remaining, read off the `X-RateLimit-*` and `X-Complexity-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ viewer { id } }" }),
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];

    const reqLimit = num(h.get("x-ratelimit-requests-limit"));
    const reqRemaining = num(h.get("x-ratelimit-requests-remaining"));
    if (reqRemaining !== undefined) {
      states.push(headroom(reqRemaining, reqLimit));
      buckets.push({
        id: "requests",
        limit: reqLimit,
        remaining: reqRemaining,
        resetAt: isoFromEpochMs(h.get("x-ratelimit-requests-reset")),
        unit: "requests",
      });
    }

    const cxLimit = num(h.get("x-complexity-limit"));
    const cxRemaining = num(h.get("x-complexity-remaining"));
    if (cxRemaining !== undefined) {
      states.push(headroom(cxRemaining, cxLimit));
      buckets.push({
        id: "complexity",
        limit: cxLimit,
        remaining: cxRemaining,
        resetAt: isoFromEpochMs(h.get("x-complexity-reset")),
        unit: "complexity",
      });
    }

    if (buckets.length === 0) {
      return { state: "unknown", message: "response carried no rate-limit headers" };
    }

    return { state: worstHealthState(states), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
