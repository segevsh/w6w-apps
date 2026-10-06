import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export const CREDITS_URL = `${API_URL}/credits`;

interface CreditsBody {
  success?: boolean;
  data?: Record<string, { remaining?: unknown; refreshesAt?: unknown } | undefined>;
}

/**
 * Credit headroom — `GET /v2/credits` (documented: "Does not consume public API
 * credits"). One reading per active credit category, keyed by the vendor's own
 * category name; the category list is read generically because the vendor says it
 * only includes "active credit-product categories", so it differs per plan.
 *
 * Search and research spend credits, so an empty bucket stops those actions with a
 * 422 `insufficientCredits`. That is a plan limit, not an outage, so an exhausted
 * bucket is `degraded`, never `down`. The vendor documents no ceiling, so only
 * `remaining` is reported — a fraction cannot be invented.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Remaining Seamless.AI credits per category, from GET /v2/credits.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(CREDITS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A refusal here says nothing about the balance itself.
      return { state: "unknown", message: `Seamless.AI returned ${res.status} for /credits` };
    }
    const body = await res.json().catch(() => null) as CreditsBody | null;
    if (!body || body.success !== true || !body.data || typeof body.data !== "object") {
      return { state: "unknown", message: "/credits response carried no credit categories" };
    }

    const quotas: HealthQuota[] = [];
    const empty: string[] = [];
    for (const [id, bucket] of Object.entries(body.data)) {
      if (!bucket || typeof bucket.remaining !== "number") continue;
      const reading: HealthQuota = { id, remaining: bucket.remaining, unit: "credits" };
      if (typeof bucket.refreshesAt === "string") reading.resetAt = bucket.refreshesAt;
      quotas.push(reading);
      if (bucket.remaining <= 0) empty.push(id);
    }
    if (quotas.length === 0) {
      return { state: "unknown", message: "No credit category with a numeric balance" };
    }

    const state: HealthState = empty.length > 0 ? "degraded" : "ok";
    return {
      state,
      message: empty.length > 0 ? `Out of credits: ${empty.join(", ")}` : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
