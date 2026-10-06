/**
 * How much prepaid balance does this account have left?
 *
 * SOLAPI's rate limits (20 reads / 100 sends per 5 seconds) are per-window bursts with a
 * `x-ratelimit-*` header set whose "remaining" resets within seconds, so they say nothing a
 * poller could act on. What actually stops a sender is **money**: `GET /cash/v1/balance` returns
 * the account's balance and points in KRW, and a send with none left fails.
 *
 * ## What a zero balance means
 *
 * Messages can also be charged to a post-paid account, so zero is not proof the account
 * cannot send. It is reported as `degraded`, never `down`: the figure is real, the verdict is a
 * warning. `limit` is left unset on purpose — SOLAPI has no ceiling on balance, and inventing
 * one (the auto-recharge target, say) would make a healthy account read as nearly empty.
 * Balance and points are reported as two separate entries.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE, baseHeaders, errorText, obj } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Prepaid balance",
  description: "Signed GET /cash/v1/balance: account balance and points in KRW. Zero balance " +
    "and zero points is degraded (post-paid accounts can still send).",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, { headers: baseHeaders() });
    const body = await res.json().catch(() => null);
    if (res.status === 429) {
      return { state: "unknown", message: "rate limited (HTTP 429) — the probe was not judged" };
    }
    if (!res.ok) {
      const msg = errorText(body);
      return {
        state: "unknown",
        message: `SOLAPI returned ${res.status}${msg ? ` (${msg})` : ""}`,
      };
    }
    const b = obj(body);
    if (typeof b.balance !== "number") {
      return { state: "unknown", message: "balance response carried no numeric `balance`" };
    }
    const point = typeof b.point === "number" ? b.point : 0;
    const quotaEntries: HealthQuota[] = [
      { id: "balance", remaining: b.balance, unit: "KRW" },
      { id: "point", remaining: point, unit: "KRW" },
    ];
    if (b.balance <= 0 && point <= 0) {
      return {
        state: "degraded",
        message: "No balance or points left — sends fail unless the account is post-paid",
        quota: quotaEntries,
        ttlSeconds: 300,
      };
    }
    return { state: "ok", quota: quotaEntries, ttlSeconds: 300 };
  },
};

export default quota;
