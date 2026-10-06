/**
 * Credit headroom. Enrich Layer publishes no rate-limit headers worth reading, but
 * `GET /credit-balance` (free, 0 credits) returns the credits left — the quota that
 * actually runs out. A signed read; the body is `{ credit_balance }`, never the key. Zero
 * credits means every billable call is refused, so that is `degraded` rather than `down`:
 * the free endpoints (balance, ID lookup, picture, disposable-email) still work.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Credits this account can still spend, from a signed `GET /credit-balance`.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/credit-balance`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `balance probe returned ${res.status}` };
    const body = await res.json().catch(() => null) as { credit_balance?: unknown } | null;
    const balance = body?.credit_balance;
    if (typeof balance !== "number") {
      return { state: "unknown", message: "balance response carried no numeric credit_balance" };
    }
    return {
      state: balance <= 0 ? "degraded" : "ok",
      message: balance <= 0 ? "no credits left" : undefined,
      quota: [{ id: "credits", remaining: balance, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
