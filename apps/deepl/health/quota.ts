/**
 * How much headroom is left on THIS credential — DeepL.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will
 *     the next translate call succeed, or is the billing period exhausted".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct here: usage is metered per API key, and
 *     reading it needs the credential on the wire.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /v2/usage`, the same call `auth.test` uses to verify liveness
 * and this app's `get-usage` action exposes as a normal read. Unlike most
 * vendors, DeepL's usage endpoint is a genuine documented quota surface
 * (character_count/character_limit, and document_count/document_limit for
 * accounts with a document cap) — not a header scraped off an unrelated
 * response — so nothing here is inferred.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { DeepLClient } from "../lib/client.ts";

interface UsageResponse {
  character_count: number;
  character_limit: number;
  document_count?: number;
  document_limit?: number;
}

/**
 * Headroom is context, not a verdict — `severity: "informational"` means
 * this state never worsens a roll-up. Reported honestly anyway so a UI can
 * show why translate calls are about to start failing with a quota error.
 */
const headroom = (remaining: number, limit: number): HealthState => {
  if (remaining <= 0) return "down";
  if (limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Billing-period quota headroom",
  description: "Characters (and documents, where the account has a cap) remaining this period.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const client = new DeepLClient(ctx);
    let res: UsageResponse;
    try {
      res = await client.request<UsageResponse>("/v2/usage");
    } catch (err) {
      return { state: "unknown", message: err instanceof Error ? err.message : String(err) };
    }

    const buckets: HealthQuota[] = [];
    const states: HealthState[] = [];

    if (typeof res.character_count === "number" && typeof res.character_limit === "number") {
      const remaining = res.character_limit - res.character_count;
      states.push(headroom(remaining, res.character_limit));
      buckets.push({
        id: "characters",
        limit: res.character_limit,
        remaining,
        unit: "characters",
      });
    }

    if (typeof res.document_count === "number" && typeof res.document_limit === "number") {
      const remaining = res.document_limit - res.document_count;
      states.push(headroom(remaining, res.document_limit));
      buckets.push({
        id: "documents",
        limit: res.document_limit,
        remaining,
        unit: "documents",
      });
    }

    if (buckets.length === 0) {
      return { state: "unknown", message: "usage response carried no recognizable limit fields" };
    }

    return { state: worstHealthState(states), quota: buckets, ttlSeconds: 60 };
  },
};

export default quota;
