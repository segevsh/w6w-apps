import type { HealthCheckDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";

/**
 * How many credits are left?
 *
 * `GET /v1/credits/balance` answers `{"balance": <number>}` — the real remaining balance, free
 * to call. Linkup publishes no plan limit, so there is no `limit` to report, only `remaining`.
 * An empty balance is `down` (every billed call will answer 429); anything above zero is `ok`:
 * Linkup documents no low-balance threshold, so none is invented.
 *
 * The API also sends `x-ratelimit-*` headers (10 per second per organisation), but that is a
 * burst limit, not headroom a workflow can plan against, so it is not reported.
 *
 * `severity: "informational"` — running out of credit is context for a human to top up, and the
 * credential check already says whether the key itself works.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Credits remaining, from GET /v1/credits/balance. Free to call.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    let body: { balance?: unknown };
    try {
      body = await new LinkupClient(ctx).get<{ balance?: unknown }>("/v1/credits/balance");
    } catch (err) {
      return { state: "unknown", message: err instanceof Error ? err.message : String(err) };
    }
    const balance = body?.balance;
    if (typeof balance !== "number") {
      return { state: "unknown", message: "the balance endpoint did not return a number" };
    }
    const quota = [{ id: "credits", remaining: balance, unit: "credits" }];
    if (balance <= 0) {
      return { state: "down", message: "no credits left", quota, ttlSeconds: 900 };
    }
    return { state: "ok", quota, ttlSeconds: 900 };
  },
};

export default quota;
