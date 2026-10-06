import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { TwoChatClient } from "../lib/client.ts";

/**
 * How much API credit does this account have left?
 *
 * `GET /info` (billing guide, 2026-10-06) is a real balance, not a header scraped off an
 * unrelated response: `usage.api_request_count` against `usage.max_api_request_count`, and
 * `usage.number_check_count` against `usage.max_number_check_count`, plus the plan's
 * `limits.requests_per_minute`. The check reports `remaining = max - used` per bucket.
 *
 * It is the same endpoint the auth `test` hook uses, and the same one 2Chat's guide calls "test
 * your API key". Note that it spends a credit when polled — hence the long `minIntervalSeconds`.
 *
 * `severity: "informational"` — running out of one bucket (number checks) does not stop messages
 * flowing, and an expiring plan is context for a human, not a verdict-worsening signal.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API credit usage",
  description:
    "Requests and number-checks used against the plan's maximum, from GET /info. Polling spends one credit.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    interface Info {
      account?: { on_trial?: boolean; blocked?: boolean; expires_at?: string };
      limits?: { requests_per_minute?: number };
      usage?: {
        api_request_count?: number;
        max_api_request_count?: number;
        number_check_count?: number;
        max_number_check_count?: number;
      };
    }
    let body: Info;
    try {
      body = await new TwoChatClient(ctx).get<Info>("/info");
    } catch (err) {
      return { state: "unknown", message: err instanceof Error ? err.message : String(err) };
    }

    const u = body.usage ?? {};
    const quotas: HealthQuota[] = [];
    const bucket = (id: string, used?: number, max?: number) => {
      if (typeof used === "number" && typeof max === "number") {
        quotas.push({ id, limit: max, remaining: Math.max(0, max - used), unit: "calls" });
      }
    };
    bucket("api_requests", u.api_request_count, u.max_api_request_count);
    bucket("number_checks", u.number_check_count, u.max_number_check_count);
    if (quotas.length === 0) {
      return { state: "unknown", message: "GET /info carried no usage counters" };
    }

    if (body.account?.blocked) {
      return { state: "down", message: "2Chat reports this account as blocked", quota: quotas };
    }
    const requests = quotas.find((q) => q.id === "api_requests");
    if (requests && requests.remaining === 0) {
      return {
        state: "down",
        message: "the plan's API request allowance is used up",
        quota: quotas,
      };
    }
    return { state: "ok", quota: quotas, ttlSeconds: 900 };
  },
};

export default quota;
