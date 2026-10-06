import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { TimelinesClient } from "../lib/client.ts";

/**
 * How much quota does this workspace have left?
 *
 * `GET /workspace` returns real counters, not a header scraped off an unrelated response:
 * `messaging_quota` and `api_calls_quota`, each `{total, used, period_start, period_end}`. The
 * check reports `remaining = total - used` per bucket. It is the same endpoint the auth `test`
 * hook uses and never contains the token.
 *
 * `severity: "informational"` — exhausting the messaging quota stops sends but not reads, and a
 * plan's allowance is context for a human rather than an outage. Only a fully used API-call
 * quota (every call refused) is `down`.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Workspace quota usage",
  description: "Messaging and API-call quota used against the plan, from GET /workspace.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    interface Bucket {
      total?: number;
      used?: number;
    }
    interface Workspace {
      data?: { messaging_quota?: Bucket; api_calls_quota?: Bucket };
    }
    let body: Workspace;
    try {
      body = await new TimelinesClient(ctx).get<Workspace>("/workspace");
    } catch (err) {
      return { state: "unknown", message: err instanceof Error ? err.message : String(err) };
    }

    const quotas: HealthQuota[] = [];
    const bucket = (id: string, b?: Bucket) => {
      if (b && typeof b.total === "number" && typeof b.used === "number") {
        quotas.push({
          id,
          limit: b.total,
          remaining: Math.max(0, b.total - b.used),
          unit: id === "messages" ? "messages" : "calls",
        });
      }
    };
    bucket("messages", body.data?.messaging_quota);
    bucket("api_calls", body.data?.api_calls_quota);
    if (quotas.length === 0) {
      return { state: "unknown", message: "GET /workspace carried no quota counters" };
    }

    const calls = quotas.find((q) => q.id === "api_calls");
    if (calls && (calls.limit ?? 0) > 0 && calls.remaining === 0) {
      return { state: "down", message: "the plan's API-call quota is used up", quota: quotas };
    }
    const msgs = quotas.find((q) => q.id === "messages");
    if (msgs && (msgs.limit ?? 0) > 0 && msgs.remaining === 0) {
      return {
        state: "degraded",
        message: "the plan's messaging quota is used up; sends will be refused",
        quota: quotas,
      };
    }
    return { state: "ok", quota: quotas, ttlSeconds: 900 };
  },
};

export default quota;
